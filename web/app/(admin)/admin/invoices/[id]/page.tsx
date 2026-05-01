import Link from "next/link";
import { notFound } from "next/navigation";
import { listClients } from "@/lib/queries/clients";
import { listProjects } from "@/lib/queries/projects";
import {
  getInvoiceById,
  listInvoiceLineItems,
  type InvoiceStatus,
} from "@/lib/queries/invoices";
import { listAllBankAccounts } from "@/lib/queries/bank-accounts";
import { formatIdr, toDateInputValue } from "@/lib/format";
import { ConfirmActionButton } from "@/app/_components/confirm-action-button";
import {
  addInvoiceLineItemAction,
  deleteInvoiceAction,
  markInvoiceIssuedAction,
  removeInvoiceLineItemAction,
  updateInvoiceAction,
} from "../actions";
import { InvoiceStatusBadge } from "../status-badge";
import { MarkPaidForm } from "./mark-paid-form";
import { StatusActionButton } from "./status-action-button";

const STATUS_OPTIONS: ReadonlyArray<{ value: InvoiceStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const [lineItems, projects, clientsAll, bankAccounts] = await Promise.all([
    listInvoiceLineItems(id),
    listProjects(),
    listClients(),
    listAllBankAccounts(),
  ]);

  const selectableBankAccounts = bankAccounts.filter(
    (a) => a.isActive || a.id === invoice.bankAccountId,
  );
  const hasSnapshot = Boolean(invoice.bankNameSnapshot);

  const clientProjects = projects.filter(
    (p) => p.clientId === invoice.clientId,
  );
  const lineItemTotal = lineItems.reduce((s, li) => s + li.totalIdr, 0);

  const updateAction = updateInvoiceAction.bind(null, id);
  const addLineAction = addInvoiceLineItemAction.bind(null, id);
  const issueAction = markInvoiceIssuedAction.bind(null, id);

  const client = clientsAll.find((c) => c.id === invoice.clientId);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-sm text-subtle">
        <Link
          href={`/admin/clients/${invoice.clientId}`}
          className="hover:underline"
        >
          {client?.name ?? invoice.clientName}
        </Link>
      </p>

      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {invoice.invoiceNumber ?? (
            <span className="text-subtle italic">Draft (number assigned at issue)</span>
          )}
        </h1>
        <InvoiceStatusBadge status={invoice.status} />
        {invoice.invoiceNumber && (
          <Link
            href={`/admin/invoices/${id}/print`}
            target="_blank"
            className="ml-auto rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft"
          >
            Print view ↗
          </Link>
        )}
      </div>

      <form action={updateAction} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Status
            </span>
            <select
              name="status"
              defaultValue={invoice.status}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
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
              defaultValue={invoice.projectId ?? ""}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">— No project —</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Bank account
          </span>
          <select
            name="bankAccountId"
            required
            defaultValue={invoice.bankAccountId ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="" disabled>
              Select a bank account…
            </option>
            {selectableBankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName} · {a.accountNumber} · {a.accountHolderName}
                {!a.isActive ? " (inactive)" : ""}
              </option>
            ))}
          </select>
          {hasSnapshot && (
            <span className="text-xs text-subtle">
              Snapshot below is what the client sees and stays frozen even if
              you change this.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Description
          </span>
          <textarea
            name="description"
            rows={2}
            defaultValue={invoice.description ?? ""}
            placeholder="What this invoice is for."
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Amount (IDR)
            </span>
            <input
              name="amountIdr"
              required
              inputMode="numeric"
              defaultValue={invoice.amountIdr}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm tabular-nums transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <span className="text-xs text-subtle">
              {formatIdr(invoice.amountIdr)}
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Issued
            </span>
            <input
              type="date"
              name="issuedAt"
              defaultValue={toDateInputValue(invoice.issuedAt)}
              className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Due
            </span>
            <input
              type="date"
              name="dueAt"
              defaultValue={toDateInputValue(invoice.dueAt)}
              className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        </div>

        <button
          type="submit"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Save changes
        </button>
      </form>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Line items</h2>
          {lineItems.length > 0 && (
            <p className="text-sm text-subtle">
              Itemized total:{" "}
              <span className="tabular-nums text-foreground">
                {formatIdr(lineItemTotal)}
              </span>
              {lineItemTotal !== invoice.amountIdr && (
                <span className="ml-2 text-amber-700">
                  (does not match invoice amount)
                </span>
              )}
            </p>
          )}
        </div>
        <p className="mt-1 text-sm text-subtle">
          Optional itemization. The invoice&apos;s total is the source of
          truth — line items are for display.
        </p>

        <form
          action={addLineAction}
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_180px_auto] sm:items-end"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Description
            </span>
            <input
              name="description"
              required
              placeholder="e.g. Discovery workshop"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Qty
            </span>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm tabular-nums transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Unit price (IDR)
            </span>
            <input
              name="unitPriceIdr"
              required
              inputMode="numeric"
              placeholder="2500000"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm tabular-nums transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
          >
            Add item
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-brand">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit price</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-subtle"
                  >
                    No line items.
                  </td>
                </tr>
              ) : (
                lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">
                      {li.description}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-subtle">
                      {li.quantity}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-subtle">
                      {formatIdr(li.unitPriceIdr)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">
                      {formatIdr(li.totalIdr)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ConfirmActionButton
                        action={removeInvoiceLineItemAction.bind(
                          null,
                          id,
                          li.id,
                        )}
                        message="Remove this line item?"
                        label="Remove"
                        pendingLabel="Removing…"
                        variant="pill"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Lifecycle</h2>
        <p className="mt-1 text-sm text-subtle">
          Move this invoice through its lifecycle. Paid requires a method.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Issue
            </p>
            <p className="mt-1 text-sm text-subtle">
              Stamps issued date and flips status to <em>issued</em>.
            </p>
            <div className="mt-2">
              <StatusActionButton
                action={issueAction}
                disabled={
                  invoice.status === "issued" ||
                  invoice.status === "paid" ||
                  invoice.status === "void"
                }
                label="Mark issued"
              />
            </div>
          </div>

          <div className="flex-1 min-w-[280px]">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Mark paid
            </p>
            <p className="mt-1 text-sm text-subtle">
              Stamps paid date, method, and reference. Cannot be undone via UI.
            </p>
            <MarkPaidForm
              invoiceId={id}
              disabled={invoice.status === "paid" || invoice.status === "void"}
            />
            {invoice.status === "paid" && invoice.paidAt && (
              <p className="mt-2 text-xs text-subtle">
                Paid {invoice.paidAt.toLocaleDateString()} via{" "}
                {invoice.paidMethod}
                {invoice.paidReference ? ` · ${invoice.paidReference}` : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {invoice.bankNameSnapshot && (
        <section className="mt-10 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Pembayaran (snapshot)
          </h2>
          <p className="mt-1 text-sm text-subtle">
            What the client sees on this invoice. Captured at issue time —
            editing the bank account record will not change this.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Bank
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {invoice.bankNameSnapshot}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Nomor rekening
              </dt>
              <dd className="mt-1 text-sm tabular-nums text-foreground">
                {invoice.accountNumberSnapshot}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Atas nama
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {invoice.accountHolderNameSnapshot}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-subtle">
          Soft-deletes the invoice. Audit log retains the record.
        </p>
        <div className="mt-4">
          <ConfirmActionButton
            action={deleteInvoiceAction.bind(null, id)}
            message="Delete this invoice? Audit log keeps the record. This cannot be undone."
            label="Delete invoice"
            pendingLabel="Deleting…"
            variant="danger"
          />
        </div>
      </section>
    </main>
  );
}
