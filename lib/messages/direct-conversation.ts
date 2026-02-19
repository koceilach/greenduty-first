import type { SupabaseClient } from "@supabase/supabase-js";

type ConversationIdRow = {
  conversation_id: string;
};

type ConversationRow = {
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

  const { data: createdConversation, error: createConversationError } = await supabase
    .from("conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();

  if (createConversationError || !createdConversation?.id) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        createConversationError,
        "Unable to create a conversation right now."
      ),
    };
  }

  const { error: participantInsertError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: createdConversation.id, user_id: currentUserId },
      { conversation_id: createdConversation.id, user_id: otherUserId },
    ]);

  if (participantInsertError) {
    return {
      conversationId: null,
      error: GD_pickErrorMessage(
        participantInsertError,
        "Conversation was created but participants could not be attached."
      ),
    };
  }

  return { conversationId: createdConversation.id, error: null };
}
