import type { SupabaseClient } from "@supabase/supabase-js";

const GD_ESCROW_RPC_TIMEOUT_MS = 12000;

const GD_withTimeout = async <T,>(
  operation: Promise<T>,
  timeoutMessage: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), GD_ESCROW_RPC_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const GD_toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
};

export async function GD_runEscrowRpc<T>(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
  timeoutMessage: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await GD_withTimeout(
      supabase.rpc(fn, args) as unknown as Promise<{
        data: T | null;
        error: { message?: string } | null;
      }>,
      timeoutMessage
    );

    if (response.error) {
      return { data: null, error: response.error.message ?? "Request failed." };
    }
    return { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: GD_toErrorMessage(error, "Request failed."),
    };
  }
}

export const GD_isMissingRpcError = (message?: string | null) => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("function") &&
    (normalized.includes("does not exist") ||
      normalized.includes("could not find the function"))
  );
};
