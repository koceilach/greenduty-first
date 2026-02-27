"use client";

import { useFormStatus } from "react-dom";

type ForumSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
};

export function ForumSubmitButton({
  label,
  pendingLabel,
  className,
}: ForumSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? pendingLabel ?? "Please wait..." : label}
    </button>
  );
}
