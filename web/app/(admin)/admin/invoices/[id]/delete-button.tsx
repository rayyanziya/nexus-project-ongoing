"use client";

import { useTransition } from "react";
import { deleteInvoiceAction } from "../actions";

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Delete this invoice? Audit log keeps the record. This cannot be undone.",
          )
        ) {
          start(() => deleteInvoiceAction(invoiceId));
        }
      }}
      className="cursor-pointer rounded-md border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete invoice"}
    </button>
  );
}
