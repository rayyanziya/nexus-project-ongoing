"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteDocumentAction } from "../actions";

export function DeleteDocumentButton({
  documentId,
}: {
  documentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    if (
      !window.confirm(
        "Delete this document permanently? The number is retired and cannot be reused.",
      )
    )
      return;
    startTransition(async () => {
      await deleteDocumentAction(documentId);
      router.push("/admin/documents");
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="cursor-pointer rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete document"}
    </button>
  );
}
