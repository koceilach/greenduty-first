"use client";

import { supabase } from "@/lib/supabase/client";

type TrackInteractionInput = {
  interactionType: "view" | "like" | "comment" | "share";
  postId?: string | null;
  reelId?: string | null;
  watchTimeSeconds?: number;
  metadata?: Record<string, unknown>;
};

export async function trackEduInteraction({
  interactionType,
  postId = null,
  reelId = null,
  watchTimeSeconds = 0,
  metadata = {},
}: TrackInteractionInput): Promise<void> {
  const safeSeconds = Number.isFinite(watchTimeSeconds)
    ? Math.max(0, watchTimeSeconds)
    : 0;

  const { error } = await supabase.rpc("edu_track_interaction", {
    p_interaction_type: interactionType,
    p_post_id: postId,
    p_reel_id: reelId,
    p_watch_time_seconds: safeSeconds,
    p_metadata: metadata,
  });

  if (!error) return;

  const normalized = error.message.toLowerCase();
  if (
    normalized.includes("authentication required") ||
    normalized.includes("edu_track_interaction") ||
    normalized.includes("does not exist")
  ) {
    return;
  }

  console.warn("Interaction tracking failed:", error.message);
}
