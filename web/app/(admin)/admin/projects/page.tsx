import Link from "next/link";
import { listClients } from "@/lib/queries/clients";
import { listProjects } from "@/lib/queries/projects";
import { createProjectAction } from "./actions";
import { CodeSuggestInput } from "./code-suggest-input";

export default async function AdminProjectsPage() {
  const [projects, clients] = await Promise.all([
    listProjects(),
    listClients(),
  ]);
  const noClients = clients.length === 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Projects
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Each project belongs to one client. Add members after creating to give
        their users access.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">
          Add a new project
        </h2>
        <p className="mt-1 text-sm text-subtle">
          You can edit the description, status, and members from the detail page
          after creating.
        </p>
        {noClients ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You need to{" "}
            <Link
              href="/admin/clients"
              className="underline hover:no-underline"
            >
              create a client
            </Link>{" "}
            first.
          </p>
        ) : (
          <form
            action={createProjectAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr_120px_auto] sm:items-end"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Client
              </span>
              <select
                name="clientId"
                required
                defaultValue=""
                className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  Select a client…
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Project name
              </span>
              <input
                id="new-project-name"
                name="name"
                required
                placeholder="e.g. ERPNext rollout"
                className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Code
              </span>
              <CodeSuggestInput nameInputId="new-project-name" />
              <span className="text-xs text-subtle">
                3 letters · immutable
              </span>
            </label>
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
            >
              Create project
            </button>
          </form>
        )}
      </section>

      <h2 className="mt-12 text-base font-semibold text-foreground">All projects</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Code</th>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-subtle"
                >
                  No projects yet. Add your first one above.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border transition-colors hover:bg-brand-soft/60"
                >
                  <td className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground">
                    {p.code}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    <Link
                      href={`/admin/clients/${p.clientId}`}
                      className="hover:underline"
                    >
                      {p.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-subtle">{p.status}</td>
                  <td className="px-4 py-2 text-subtle">
                    {p.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
