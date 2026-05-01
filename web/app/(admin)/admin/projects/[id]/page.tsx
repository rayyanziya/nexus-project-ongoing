import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProjectById, type ProjectStatus } from "@/lib/queries/projects";
import {
  listAvailableMembersForProject,
  listProjectMembers,
} from "@/lib/queries/project-members";
import { ProjectFeed } from "@/app/_components/feed/project-feed";
import { listAdmins, listTasksForProject } from "@/lib/queries/tasks";
import { addMemberAction, updateProjectAction } from "../actions";
import { DeleteProjectButton } from "./delete-button";
import { RemoveMemberButton } from "./remove-member-button";
import { TasksSection } from "./tasks-section";

const STATUS_OPTIONS: ReadonlyArray<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "delivered", label: "Delivered" },
  { value: "archived", label: "Archived" },
];

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function DateField({
  name,
  label,
  value,
  help,
}: {
  name: string;
  label: string;
  value: Date | null;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="date"
        name={name}
        defaultValue={toDateInputValue(value)}
        className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
      />
      {help && <span className="text-xs text-subtle">{help}</span>}
    </label>
  );
}

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clerkUserId } = await requireAdmin();
  const project = await getProjectById(id);
  if (!project) notFound();

  const [members, available, projectTasks, admins] = await Promise.all([
    listProjectMembers(id),
    listAvailableMembersForProject({
      projectId: id,
      clientId: project.clientId,
    }),
    listTasksForProject(id),
    listAdmins(),
  ]);

  const updateAction = updateProjectAction.bind(null, id);
  const addAction = addMemberAction.bind(null, id);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-sm text-subtle">
        <Link
          href={`/admin/clients/${project.clientId}`}
          className="hover:underline"
        >
          {project.clientName}
        </Link>
        <span className="ml-3 inline-block rounded border border-border px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-foreground">
          {project.code}
        </span>
      </p>

      <form action={updateAction} className="mt-2 space-y-4">
        <input
          name="name"
          required
          defaultValue={project.name}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-2xl font-semibold tracking-tight text-foreground transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={project.description ?? ""}
              placeholder="Short summary of the engagement, scope, and deliverables."
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Status
            </span>
            <select
              name="status"
              defaultValue={project.status}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DateField
            name="startedAt"
            label="Started"
            value={project.startedAt}
          />
          <DateField
            name="expectedDeliveryAt"
            label="Expected delivery"
            value={project.expectedDeliveryAt}
          />
          <DateField
            name="deliveredAt"
            label="Delivered"
            value={project.deliveredAt}
            help="Auto-set when status flips to Delivered."
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Save changes
        </button>
      </form>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Members</h2>
        <p className="mt-1 text-sm text-subtle">
          Only members can see this project&apos;s files and chat in their
          portal.
        </p>
        <form action={addAction} className="mt-4 flex gap-2">
          <select
            name="clientUserId"
            required
            defaultValue=""
            disabled={available.length === 0}
            className="flex-1 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
          >
            <option value="" disabled>
              {available.length === 0
                ? "All client users are already members"
                : "Select a user to add…"}
            </option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
                {u.fullName ? ` — ${u.fullName}` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={available.length === 0}
            className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add member
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-brand">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Added</th>
                <th className="px-4 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-subtle"
                  >
                    No members yet. Add one above.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-border transition-colors hover:bg-brand-soft/60"
                  >
                    <td className="px-4 py-2 text-foreground">{m.email}</td>
                    <td className="px-4 py-2 text-subtle">
                      {m.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-subtle">
                      {m.addedAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <RemoveMemberButton
                        projectId={id}
                        clientUserId={m.id}
                        email={m.email}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TasksSection projectId={id} tasks={projectTasks} admins={admins} />

      <ProjectFeed
        projectId={id}
        viewer={{ kind: "admin", clerkUserId }}
      />

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-subtle">
          Soft-deletes the project. Files and chat history remain in storage.
        </p>
        <div className="mt-4">
          <DeleteProjectButton projectId={id} />
        </div>
      </section>
    </main>
  );
}
