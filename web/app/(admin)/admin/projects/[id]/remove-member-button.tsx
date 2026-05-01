"use client";

import { useTransition } from "react";
import { removeMemberAction } from "../actions";

export function RemoveMemberButton({
  projectId,
  clientUserId,
  email,
}: {
  projectId: string;
  clientUserId: string;
  email: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove ${email} from this project?`)) {
          start(() => removeMemberAction(projectId, clientUserId));
        }
      }}
      className="cursor-pointer rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand active:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
