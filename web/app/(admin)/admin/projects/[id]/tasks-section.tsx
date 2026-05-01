import {
  TASK_PRIORITY_OPTIONS,
} from "@/app/_components/tasks/task-badges";
import type { AdminUser, Task } from "@/lib/queries/tasks";
import { TaskRow } from "./task-row";
import { createTaskAction } from "./tasks-actions";

export function TasksSection({
  projectId,
  tasks,
  admins,
}: {
  projectId: string;
  tasks: Task[];
  admins: AdminUser[];
}) {
  const createAction = createTaskAction.bind(null, projectId);
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
        <p className="text-sm text-subtle">
          {open.length} open · {done.length} done
        </p>
      </div>
      <p className="mt-1 text-sm text-subtle">
        Internal-only. Clients do not see tasks.
      </p>

      <form
        action={createAction}
        className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[1fr_140px_140px_140px_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Title
          </span>
          <input
            name="title"
            required
            placeholder="What needs doing?"
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Assignee
          </span>
          <select
            name="assigneeAdminId"
            defaultValue=""
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">— Unassigned —</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName?.trim() || a.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Priority
          </span>
          <select
            name="priority"
            defaultValue="medium"
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {TASK_PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Due
          </span>
          <input
            type="date"
            name="dueAt"
            className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Add task
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Title</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Priority</th>
              <th className="px-3 py-2 text-left font-medium">Assignee</th>
              <th className="px-3 py-2 text-left font-medium">Due</th>
              <th className="px-3 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-subtle"
                >
                  No tasks yet. Add one above.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  projectId={projectId}
                  task={task}
                  admins={admins}
                  overdue={
                    task.dueAt !== null &&
                    task.status !== "done" &&
                    task.dueAt.getTime() < now
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
