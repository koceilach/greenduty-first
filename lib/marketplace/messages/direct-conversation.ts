import type { SupabaseClient } from "@supabase/supabase-js";

type ConversationIdRow = {
  conversation_id: string;
};

type ConversationRow = {
  id: string;
};

type MarketplaceDirectConversationResult = {
  conversationId: string | null;
  error: string | null;
};

type MarketplaceChatContext = {
  itemId?: string | null;
  itemTitle?: string | null;
  itemImageUrl?: string | null;
  itemPriceDzd?: number | null;
};

const GD_pickErrorMessage = (error: { message?: string } | null, fallback: string) => {
  const message = error?.message?.trim();
  return message && message.length > 0 ? message : fallback;
};

export async function GD_findOrCreateMarketplaceDirectConversation(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string,
  context?: MarketplaceChatContext
): Promise<MarketplaceDirectConversationResult> {
  if (!currentUserId || !otherUserId) {
    return { conversationId: null, error: "Missing user id for chat." };
  }

  if (currentUserId === otherUserId) {
    return { conversationId: null, error: "You cannot message your own account." };
  }

  const tryRpc = async (withItem: boolean) => {
    const rpcResult = await supabase.rpc("marketplace_find_or_create_direct_conversation", {
      p_other_user_id: otherUserId,
      ...(withItem ? { p_item_id: context?.itemId ?? null } : {}),
    });

    if (!rpcResult.error) {
      const conversationId =
        typeof rpcResult.data === "string" ? rpcResult.data : null;
      if (conversationId) {
        return { conversationId, error: null };
      }
      return { conversationId: null, error: "Unable to open marketplace chat right now." };
    }

    const rpcMessage = (rpcResult.error.message ?? "").toLowerCase();
    const missingRpc =
      rpcMessage.includes("could not find the function") ||
      (rpcMessage.includes("function") && rpcMessage.includes("does not exist"));

    if (missingRpc) {
      return null;
    }

    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        rpcResult.error,
        "Unable to open marketplace chat right now."
      ),
    };
  };

  let rpcWithItem = await tryRpc(true);
  if (
    rpcWithItem &&
    rpcWithItem.error?.toLowerCase().includes("profile not found for current user")
  ) {
    const { error: ensureError } = await supabase.rpc("ensure_marketplace_profile");
    if (!ensureError) {
      rpcWithItem = await tryRpc(true);
    }
  }
  if (rpcWithItem) {
    return rpcWithItem;
  }

  const rpcLegacy = await tryRpc(false);
  if (rpcLegacy) {
    return rpcLegacy;
  }

  const { data: currentRows, error: currentRowsError } = await supabase
    .from("marketplace_conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (currentRowsError) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(currentRowsError, "Unable to load your marketplace chats."),
    };
  }

  const myConversationIds = Array.from(
    new Set(
      ((currentRows ?? []) as ConversationIdRow[])
        .map((row) => row.conversation_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  if (myConversationIds.length > 0) {
    const { data: sharedRows, error: sharedRowsError } = await supabase
      .from("marketplace_conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConversationIds);

    if (sharedRowsError) {
      return {
        conversationId: null,
        error: GD_pickErrorMessage(sharedRowsError, "Unable to open marketplace chat right now."),
      };
    }

    const sharedConversationIds = Array.from(
      new Set(
        ((sharedRows ?? []) as ConversationIdRow[])
          .map((row) => row.conversation_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    if (sharedConversationIds.length > 0) {
      const { data: directRows, error: directRowsError } = await supabase
        .from("marketplace_conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", sharedConversationIds)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (directRowsError) {
        return {
          conversationId: null,
          error: GD_pickErrorMessage(directRowsError, "Unable to open marketplace chat right now."),
        };
      }

      const conversationId = ((directRows ?? []) as ConversationRow[])[0]?.id ?? null;
      if (conversationId) {
        if (context?.itemId) {
          await supabase
            .from("marketplace_conversations")
            .update({
              pinned_item_id: context.itemId,
              pinned_item_title: context.itemTitle ?? null,
              pinned_item_image_url: context.itemImageUrl ?? null,
              pinned_item_price_dzd: context.itemPriceDzd ?? null,
              pinned_by: currentUserId,
              pinned_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        }
        return { conversationId, error: null };
      }
    }
  }

  const { data: createdConversation, error: createConversationError } = await supabase
    .from("marketplace_conversations")
    .insert({
      type: "direct",
      pinned_item_id: context?.itemId ?? null,
      pinned_item_title: context?.itemTitle ?? null,
      pinned_item_image_url: context?.itemImageUrl ?? null,
      pinned_item_price_dzd: context?.itemPriceDzd ?? null,
      pinned_by: context?.itemId ? currentUserId : null,
      pinned_at: context?.itemId ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (createConversationError || !createdConversation?.id) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        createConversationError,
        "Unable to create marketplace chat right now."
      ),
    };
  }

  const { error: participantsError } = await supabase
    .from("marketplace_conversation_participants")
    .insert([
      {
        conversation_id: createdConversation.id,
        user_id: currentUserId,
      },
      {
        conversation_id: createdConversation.id,
        user_id: otherUserId,
      },
    ]);

  if (participantsError) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        participantsError,
        "Chat was created but participants were not attached."
      ),
    };
  }

  return { conversationId: createdConversation.id, error: null };
}
