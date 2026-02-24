import type { SupabaseClient } from "@supabase/supabase-js";

type ConversationIdRow = {
  conversation_id: string;
};

type ConversationRow = {
  id: string;
};

type InsertedConversationRow = {
  id: string;
};

type DirectConversationResult = {
  conversationId: string | null;
  error: string | null;
};

const GD_pickErrorMessage = (error: { message?: string } | null, fallback: string) => {
  const message = error?.message?.trim();
  return message && message.length > 0 ? message : fallback;
};

/**
 * Returns an existing direct conversation between two users or creates one.
 */
export async function GD_findOrCreateDirectConversation(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
): Promise<DirectConversationResult> {
  if (!currentUserId || !otherUserId) {
    return { conversationId: null, error: "Missing user id for chat." };
  }

  if (currentUserId === otherUserId) {
    return { conversationId: null, error: "You cannot message your own account." };
  }

  const rpcResult = await supabase.rpc("find_or_create_direct_conversation", {
    p_other_user_id: otherUserId,
  });

  if (!rpcResult.error) {
    const conversationId =
      typeof rpcResult.data === "string" ? rpcResult.data : null;
    if (conversationId) {
      return { conversationId, error: null };
    }
    return {
      conversationId: null,
      error: "Unable to open chat right now.",
    };
  }

  const rpcMessage = (rpcResult.error.message ?? "").toLowerCase();
  const missingRpc =
    rpcMessage.includes("could not find the function") ||
    (rpcMessage.includes("function") && rpcMessage.includes("does not exist"));

  if (!missingRpc) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(rpcResult.error, "Unable to open chat right now."),
    };
  }

  // Legacy fallback path: find existing direct conversation only.
  const { data: currentRows, error: currentRowsError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (currentRowsError) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(currentRowsError, "Unable to load your conversations."),
    };
  }

  const currentConversationIds = Array.from(
    new Set(
      ((currentRows ?? []) as ConversationIdRow[])
        .map((row) => row.conversation_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  if (currentConversationIds.length > 0) {
    const { data: sharedRows, error: sharedRowsError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", currentConversationIds);

    if (sharedRowsError) {
      return {
        conversationId: null,
        error: GD_pickErrorMessage(sharedRowsError, "Unable to open chat right now."),
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
        .from("conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", sharedConversationIds)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (directRowsError) {
        return {
          conversationId: null,
          error: GD_pickErrorMessage(directRowsError, "Unable to open chat right now."),
        };
      }

      const existingConversationId = ((directRows ?? []) as ConversationRow[])[0]?.id ?? null;
      if (existingConversationId) {
        return { conversationId: existingConversationId, error: null };
      }
    }
  }

  // Final fallback: create conversation client-side when RPC is unavailable.
  // This keeps messaging functional on environments where the SQL function is not deployed yet.
  const { data: insertedConversation, error: conversationInsertError } = await supabase
    .from("conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();

  if (conversationInsertError || !insertedConversation?.id) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        conversationInsertError,
        "Unable to start a new chat right now."
      ),
    };
  }

  const conversationId = (insertedConversation as InsertedConversationRow).id;
  const { error: participantInsertError } = await supabase
    .from("conversation_participants")
    .upsert(
      [
        { conversation_id: conversationId, user_id: currentUserId },
        { conversation_id: conversationId, user_id: otherUserId },
      ],
      { onConflict: "conversation_id,user_id" }
    );

  if (participantInsertError) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        participantInsertError,
        "Conversation was created but participants could not be added."
      ),
    };
  }

  return { conversationId, error: null };
}
