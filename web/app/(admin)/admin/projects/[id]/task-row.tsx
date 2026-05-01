"use client";

import { useTransition } from "react";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/app/_components/tasks/task-badges";
import { ConfirmActionButton } from "@/app/_components/confirm-action-button";
import { toDateInputValue } from "@/lib/format";
import type { AdminUser, Task } from "@/lib/queries/tasks";
import { deleteTaskAction, updateTaskAction } from "./tasks-actions";

function adminLabel(admin: AdminUser): string {
  return admin.fullName?.trim() || admin.email;
}

export function TaskRow({
  projectId,
  task,
  admins,
  overdue,
}: {
  projectId: string;
  task: Task;
  admins: AdminUser[];
  overdue: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const updateAction = updateTaskAction.bind(null, projectId, task.id);
  const assigneeKnown = task.assigneeAdminId
    ? admins.some((a) => a.id === task.assigneeAdminId)
    : true;

  function submit(form: HTMLFormElement | null) {
    if (!form) return;
    const data = new FormData(form);
    startTransition(async () => {
      await updateAction(data);
    });
  }

  return (
    <tr className={`border-t border-border align-top ${pending ? "opacity-60" : ""}`}>
      <td className="px-3 py-2 text-foreground">
        <form>
          <input
            name="title"
            defaultValue={task.title}
            className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            onBlur={(e) => {
              if (e.currentTarget.value.trim() === task.title) return;
              submit(e.currentTarget.form);
            }}
          />
        </form>
      </td>
      <td className="px-3 py-2">
        <form>
          <select
            name="status"
            defaultValue={task.status}
            onChange={(e) => submit(e.currentTarget.form)}
            className="cursor-pointer rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-xs transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Status"
          >
            {TASK_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </form>
      </td>
      <td className="px-3 py-2">
        <form>
          <select
            name="priority"
            defaultValue={task.priority}
            onChange={(e) => submit(e.currentTarget.form)}
            className="cursor-pointer rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-xs transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Priority"
          >
            {TASK_PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </form>
      </td>
      <td className="px-3 py-2 text-subtle">
        <form>
          <select
            name="assigneeAdminId"
            defaultValue={task.assigneeAdminId ?? ""}
            onChange={(e) => submit(e.currentTarget.form)}
            className="cursor-pointer rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-xs transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Assignee"
          >
            <option value="">— Unassigned —</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {adminLabel(a)}
              </option>
            ))}
            {!assigneeKnown && task.assigneeAdminId && (
              <option value={task.assigneeAdminId}>(former admin)</option>
            )}
          </select>
        </form>
      </td>
      <td className="px-3 py-2 text-subtle">
        <form>
          <input
            type="date"
            name="dueAt"
            defaultValue={toDateInputValue(task.dueAt)}
            onChange={(e) => submit(e.currentTarget.form)}
            className={`cursor-pointer rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-xs transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${
              overdue ? "text-red-700" : ""
            }`}
            aria-label="Due date"
          />
        </form>
      </td>
      <td className="px-3 py-2 text-right">
        <ConfirmActionButton
          action={deleteTaskAction.bind(null, projectId, task.id)}
          message="Delete this task?"
          label="Delete"
          pendingLabel="Deleting…"
          variant="danger-text"
        />
      </td>
    </tr>
  );
}
