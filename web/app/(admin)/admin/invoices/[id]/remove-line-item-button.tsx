"use client";

import { useTransition } from "react";
import { removeInvoiceLineItemAction } from "../actions";

export function RemoveLineItemButton({
  invoiceId,
  lineItemId,
}: {
  invoiceId: string;
  lineItemId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this line item?")) {
          start(() => removeInvoiceLineItemAction(invoiceId, lineItemId));
        }
      }}
      className="cursor-pointer rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand active:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
