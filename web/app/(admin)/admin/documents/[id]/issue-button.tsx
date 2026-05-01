"use client";

import { useTransition, useState } from "react";
import { issueDocumentAction } from "../actions";

export function IssueDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (pending) return;
    if (
      !window.confirm(
        "Issue this document? A document number will be allocated and locked permanently.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await issueDocumentAction(documentId);
      if (!result.ok) setError(result.reason);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="cursor-pointer rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Issuing…" : "Issue document"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
