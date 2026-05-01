"use client";

import { useTransition } from "react";
import { deleteProjectAction } from "../actions";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Delete this project? Members will lose access to its files and chat. This cannot be undone.",
          )
        ) {
          start(() => deleteProjectAction(projectId));
        }
      }}
      className="cursor-pointer rounded-md border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete project"}
    </button>
  );
}
