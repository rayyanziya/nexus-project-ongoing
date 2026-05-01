import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  listAdmins,
  listOpenTasks,
  listTasksForAssignee,
  type AdminUser,
  type TaskWithProject,
} from "@/lib/queries/tasks";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/app/_components/tasks/task-badges";

export default async function AdminTasksPage() {
  const { clerkUserId } = await requireAdmin();
  const [mine, open, admins] = await Promise.all([
    listTasksForAssignee(clerkUserId),
    listOpenTasks(),
    listAdmins(),
  ]);
  const adminById = new Map(admins.map((a) => [a.id, a] as const));
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Tasks
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Internal task tracker across every project. Click a row to open the
        project.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">My tasks</h2>
        <p className="mt-1 text-sm text-subtle">
          Tasks assigned to you. {mine.length} total.
        </p>
        <TasksTable rows={mine} adminById={adminById} now={now} emptyText="Nothing assigned to you yet." />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">All open tasks</h2>
        <p className="mt-1 text-sm text-subtle">
          Everything that isn&apos;t done. {open.length} total.
        </p>
        <TasksTable rows={open} adminById={adminById} now={now} emptyText="No open tasks." />
      </section>
    </main>
  );
}

function TasksTable({
  rows,
  adminById,
  now,
  emptyText,
}: {
  rows: TaskWithProject[];
  adminById: Map<string, AdminUser>;
  now: number;
  emptyText: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-brand-soft text-brand">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Project</th>
            <th className="px-3 py-2 text-left font-medium">Title</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Priority</th>
            <th className="px-3 py-2 text-left font-medium">Assignee</th>
            <th className="px-3 py-2 text-left font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-subtle">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((task) => {
              const assignee = task.assigneeAdminId
                ? adminById.get(task.assigneeAdminId)
                : null;
              const overdue =
                task.dueAt !== null &&
                task.status !== "done" &&
                task.dueAt.getTime() < now;
              return (
                <tr
                  key={task.id}
                  className="border-t border-border transition-colors hover:bg-brand-soft/60"
                >
                  <td className="px-3 py-2 text-subtle">
                    <Link
                      href={`/admin/projects/${task.projectId}`}
                      className="hover:underline"
                    >
                      <span className="mr-2 inline-block rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                        {task.projectCode}
                      </span>
                      {task.projectName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-foreground">{task.title}</td>
                  <td className="px-3 py-2">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-3 py-2">
                    <TaskPriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-3 py-2 text-subtle">
                    {assignee
                      ? assignee.fullName?.trim() || assignee.email
                      : task.assigneeAdminId
                        ? "(former admin)"
                        : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-subtle ${overdue ? "text-red-700" : ""}`}
                  >
                    {task.dueAt ? task.dueAt.toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
