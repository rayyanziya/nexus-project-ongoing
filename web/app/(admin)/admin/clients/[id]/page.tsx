import { notFound } from "next/navigation";
import { getClientById } from "@/lib/queries/clients";
import { listClientUsersByClientId } from "@/lib/queries/client-users";
import { ConfirmActionButton } from "@/app/_components/confirm-action-button";
import { deleteClientAction, updateClientNameAction } from "../actions";
import { InviteUserForm } from "./invite-form";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const users = await listClientUsersByClientId(id);
  const renameAction = updateClientNameAction.bind(null, id);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <form action={renameAction} className="flex items-center gap-2">
        <input
          name="name"
          required
          defaultValue={client.name}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-2xl font-semibold tracking-tight text-foreground transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Save name
        </button>
      </form>
      <p className="mt-2 text-sm text-subtle">
        /{client.slug} · {client.status}
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Provision a user</h2>
        <p className="mt-1 text-sm text-subtle">
          Sends a Clerk invitation. The user joins this client when they accept.
        </p>
        <InviteUserForm clientId={id} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-brand">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-subtle"
                  >
                    No users yet. Send an invitation above.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-border transition-colors hover:bg-brand-soft/60"
                  >
                    <td className="px-4 py-2 text-foreground">{u.email}</td>
                    <td className="px-4 py-2 text-subtle">
                      {u.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-subtle">{u.role}</td>
                    <td className="px-4 py-2 text-subtle">{u.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-subtle">
          Soft-deletes the client. User accounts in Clerk are not removed.
        </p>
        <div className="mt-4">
          <ConfirmActionButton
            action={deleteClientAction.bind(null, id)}
            message="Delete this client? Their users will lose access. This cannot be undone."
            label="Delete client"
            pendingLabel="Deleting…"
            variant="danger"
          />
        </div>
      </section>
    </main>
  );
}
