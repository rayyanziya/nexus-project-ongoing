import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import {
  getInvoiceForClient,
  listInvoiceLineItems,
} from "@/lib/queries/invoices";
import { formatIdr } from "@/lib/format";
import { ClientInvoiceStatusBadge } from "../status-badge";

export default async function ClientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clientUser } = await requireClient();
  const invoice = await getInvoiceForClient({
    invoiceId: id,
    clientId: clientUser.clientId,
  });
  if (!invoice) notFound();

  const lineItems = await listInvoiceLineItems(id);
  const lineItemTotal = lineItems.reduce((s, li) => s + li.totalIdr, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/dashboard/invoices"
        className="text-sm text-subtle transition-colors hover:text-brand"
      >
        ← All invoices
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {invoice.invoiceNumber}
          </h1>
          {invoice.projectId && invoice.projectName && (
            <p className="mt-1 text-sm text-subtle">
              <Link
                href={`/dashboard/projects/${invoice.projectId}`}
                className="hover:underline"
              >
                {invoice.projectName}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ClientInvoiceStatusBadge status={invoice.status} />
          <Link
            href={`/dashboard/invoices/${id}/print`}
            target="_blank"
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft"
          >
            Print / PDF ↗
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Field label="Amount">
          <span className="tabular-nums">{formatIdr(invoice.amountIdr)}</span>
        </Field>
        <Field label="Issued">
          {invoice.issuedAt ? invoice.issuedAt.toLocaleDateString() : "—"}
        </Field>
        <Field label="Due">
          {invoice.dueAt ? invoice.dueAt.toLocaleDateString() : "—"}
        </Field>
        <Field label="Paid">
          {invoice.paidAt ? invoice.paidAt.toLocaleDateString() : "—"}
        </Field>
      </dl>

      {invoice.description && (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
            Description
          </h2>
          <p className="mt-2 text-sm text-foreground">{invoice.description}</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-base font-semibold text-foreground">Line items</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-brand">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit price</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr className="border-t border-border">
                  <td className="px-4 py-2 text-foreground" colSpan={3}>
                    {invoice.description ?? "Jasa profesional"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {formatIdr(invoice.amountIdr)}
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
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {lineItems.length > 0 && lineItemTotal !== invoice.amountIdr && (
                <tr className="border-t border-border text-xs text-subtle">
                  <td colSpan={3} className="px-4 pt-2 text-right">
                    Subtotal item
                  </td>
                  <td className="px-4 pt-2 text-right tabular-nums">
                    {formatIdr(lineItemTotal)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-border-strong font-semibold">
                <td colSpan={3} className="px-4 py-2 text-right uppercase tracking-wide">
                  Total
                </td>
                <td className="px-4 py-2 text-right text-base tabular-nums text-foreground">
                  {formatIdr(invoice.amountIdr)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {invoice.bankNameSnapshot ? (
        <section className="mt-10 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-foreground">
            Pembayaran via transfer bank
          </h2>
          <p className="mt-1 text-sm text-subtle">
            Transfer to the account below and use the invoice number as the
            transfer reference so we can match it.
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
      ) : (
        <p className="mt-10 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Payment details pending — please contact GDI.
        </p>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
