"use client";

import { useState, useTransition } from "react";

type ActionResult = void | { ok: boolean; reason?: string };

export function StatusActionButton({
  action,
  label,
  disabled,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await action();
            if (result && result.ok === false) {
              setError(result.reason ?? "Could not complete this action.");
            }
          })
        }
        className="cursor-pointer rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Working…" : label}
      </button>
      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
