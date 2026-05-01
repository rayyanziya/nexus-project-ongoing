"use client";

import { useTransition } from "react";
import { setBankAccountActiveAction } from "../actions";

export function ActiveToggleButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  const next = !isActive;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setBankAccountActiveAction(id, next))}
      className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
