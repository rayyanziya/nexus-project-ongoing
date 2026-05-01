"use client";

import { useTransition } from "react";
import { markInvoicePaidAction } from "../actions";

export function MarkPaidForm({
  invoiceId,
  disabled,
}: {
  invoiceId: string;
  disabled?: boolean;
}) {
  const action = markInvoicePaidAction.bind(null, invoiceId);
  const [pending, start] = useTransition();

  return (
    <form
      action={(formData) => start(() => action(formData))}
      className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Method
        </span>
        <input
          name="paidMethod"
          required
          disabled={disabled || pending}
          placeholder="Bank transfer"
          className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Reference
        </span>
        <input
          name="paidReference"
          disabled={disabled || pending}
          placeholder="Transfer ID, cheque #, etc."
          className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || pending}
        className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Marking…" : "Mark paid"}
      </button>
    </form>
  );
}
