"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const VARIANTS = {
  danger:
    "rounded-md border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 active:bg-red-100",
  "danger-soft":
    "rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100",
  "danger-text":
    "text-xs font-medium text-subtle transition-colors hover:text-red-700",
  pill: "rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand active:bg-brand-soft",
} as const;

type Variant = keyof typeof VARIANTS;

export function ConfirmActionButton({
  action,
  message,
  label,
  pendingLabel = "Working…",
  variant = "danger",
  redirectTo,
}: {
  action: () => Promise<unknown>;
  message: string;
  label: string;
  pendingLabel?: string;
  variant?: Variant;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(message)) return;
        start(async () => {
          await action();
          if (redirectTo) router.push(redirectTo);
        });
      }}
      className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
