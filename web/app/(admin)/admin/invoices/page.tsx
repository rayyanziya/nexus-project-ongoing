import Link from "next/link";
import { listClients } from "@/lib/queries/clients";
import { listProjects } from "@/lib/queries/projects";
import { listInvoices } from "@/lib/queries/invoices";
import { listActiveBankAccounts } from "@/lib/queries/bank-accounts";
import { formatIdr } from "@/lib/format";
import { createInvoiceAction } from "./actions";
import { InvoiceStatusBadge } from "./status-badge";

export default async function AdminInvoicesPage() {
  const [invoices, clients, projects, bankAccounts] = await Promise.all([
    listInvoices(),
    listClients(),
    listProjects(),
    listActiveBankAccounts(),
  ]);
  const noClients = clients.length === 0;
  const noBankAccounts = bankAccounts.length === 0;
  const projectsByClient = new Map<string, typeof projects>();
  for (const p of projects) {
    const list = projectsByClient.get(p.clientId) ?? [];
    list.push(p);
    projectsByClient.set(p.clientId, list);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Invoices
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Bill clients in IDR. Mark paid manually after confirming the transfer.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">
          Add a new invoice
        </h2>
        <p className="mt-1 text-sm text-subtle">
          Drafts have no number yet. The official{" "}
          <code className="font-mono text-xs">GDI/INV/&hellip;</code> number is
          assigned automatically when you mark the invoice issued.
        </p>
        {noClients || noBankAccounts ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You need to{" "}
            {noClients && (
              <>
                <Link
                  href="/admin/clients"
                  className="underline hover:no-underline"
                >
                  create a client
                </Link>
                {noBankAccounts ? " and " : " "}
              </>
            )}
            {noBankAccounts && (
              <Link
                href="/admin/bank-accounts"
                className="underline hover:no-underline"
              >
                add a bank account
              </Link>
            )}{" "}
            first.
          </p>
        ) : (
          <form
            action={createInvoiceAction}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
                Project (optional)
              </span>
              <select
                name="projectId"
                defaultValue=""
                className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">— No project —</option>
                {clients.map((c) => {
                  const list = projectsByClient.get(c.id) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <optgroup key={c.id} label={c.name}>
                      {list.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Bank account
              </span>
              <select
                name="bankAccountId"
                required
                defaultValue=""
                className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  Select a bank account…
                </option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} · {a.accountNumber} · {a.accountHolderName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 lg:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Description
              </span>
              <input
                name="description"
                placeholder="e.g. Phase 1 retainer — April"
                className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Amount (IDR)
              </span>
              <input
                name="amountIdr"
                required
                inputMode="numeric"
                placeholder="15000000"
                className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm tabular-nums transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <div className="flex items-end lg:col-span-3">
              <button
                type="submit"
                className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
              >
                Create
              </button>
            </div>
          </form>
        )}
      </section>

      <h2 className="mt-12 text-base font-semibold text-foreground">All invoices</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Number</th>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Project</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Issued</th>
              <th className="px-4 py-2 text-left font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-subtle"
                >
                  No invoices yet. Add your first one above.
                </td>
              </tr>
            ) : (
              invoices.map((i) => (
                <tr
                  key={i.id}
                  className="border-t border-border transition-colors hover:bg-brand-soft/60"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/invoices/${i.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {i.invoiceNumber ?? (
                        <span className="text-subtle italic">draft</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    <Link
                      href={`/admin/clients/${i.clientId}`}
                      className="hover:underline"
                    >
                      {i.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {i.projectId && i.projectName ? (
                      <Link
                        href={`/admin/projects/${i.projectId}`}
                        className="hover:underline"
                      >
                        {i.projectName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {formatIdr(i.amountIdr)}
                  </td>
                  <td className="px-4 py-2">
                    <InvoiceStatusBadge status={i.status} />
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {i.issuedAt ? i.issuedAt.toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {i.dueAt ? i.dueAt.toLocaleDateString() : "—"}
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
