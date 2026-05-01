import Link from "next/link";
import { listClients } from "@/lib/queries/clients";
import { createClientAction } from "./actions";

export default async function AdminClientsPage() {
  const clients = await listClients();
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Clients
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Each client is a customer organization. Create one before inviting their
        users or attaching projects.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">
          Add a new client
        </h2>
        <p className="mt-1 text-sm text-subtle">
          A URL-safe slug is generated from the name. You can rename it later;
          the slug stays.
        </p>
        <form action={createClientAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Client name
            </span>
            <input
              name="name"
              required
              placeholder="e.g. PT GDI"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
          >
            Create client
          </button>
        </form>
      </section>

      <h2 className="mt-12 text-base font-semibold text-foreground">All clients</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Slug</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-subtle"
                >
                  No clients yet. Add your first one above.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border transition-colors hover:bg-brand-soft/60"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-subtle">{c.slug}</td>
                  <td className="px-4 py-2 text-subtle">{c.status}</td>
                  <td className="px-4 py-2 text-subtle">
                    {c.createdAt.toLocaleDateString()}
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
