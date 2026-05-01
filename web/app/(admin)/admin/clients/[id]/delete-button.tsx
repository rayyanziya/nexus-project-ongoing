"use client";

import { useTransition } from "react";
import { deleteClientAction } from "../actions";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Delete this client? Their users will lose access. This cannot be undone.",
          )
        ) {
          start(() => deleteClientAction(clientId));
        }
      }}
      className="cursor-pointer rounded-md border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete client"}
    </button>
  );
}
