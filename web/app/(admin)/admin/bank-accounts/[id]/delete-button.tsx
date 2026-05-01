"use client";

import { useTransition } from "react";
import { deleteBankAccountAction } from "../actions";

export function DeleteBankAccountButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Delete this bank account? Past invoices keep their snapshot, but you cannot pick it on new invoices.",
          )
        ) {
          start(() => deleteBankAccountAction(id));
        }
      }}
      className="cursor-pointer rounded-md border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete account"}
    </button>
  );
}
