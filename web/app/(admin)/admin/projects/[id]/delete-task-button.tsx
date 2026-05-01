"use client";

import { useTransition } from "react";
import { deleteTaskAction } from "./tasks-actions";

export function DeleteTaskButton({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    if (!window.confirm("Delete this task?")) return;
    startTransition(async () => {
      await deleteTaskAction(projectId, taskId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
