import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { listInvoicesForClient } from "@/lib/queries/invoices";
import { formatIdr } from "@/lib/format";
import { ClientInvoiceStatusBadge } from "./status-badge";

export default async function ClientInvoicesPage() {
  const { clientUser } = await requireClient();
  const invoices = await listInvoicesForClient(clientUser.clientId);

  const unpaid = invoices.filter((i) => i.status !== "paid");
  const outstanding = unpaid.reduce((s, i) => s + i.amountIdr, 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Invoices
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Issued and paid invoices from GDI. Pay via bank transfer using the
        details on each invoice.
      </p>

      {invoices.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Outstanding"
            value={formatIdr(outstanding)}
            tone={outstanding > 0 ? "warn" : "neutral"}
          />
          <SummaryCard
            label="Invoices on file"
            value={String(invoices.length)}
          />
        </div>
      )}

      {unpaid.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">
            How to pay
          </h2>
          <p className="mt-1 text-sm text-subtle">
            Transfer the amount below to the listed account. Use the invoice
            number as the transfer reference so we can match it.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {unpaid.map((i) => (
              <article
                key={i.id}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/invoices/${i.id}`}
                      className="text-xs font-medium uppercase tracking-wide text-muted hover:text-brand hover:underline"
                    >
                      {i.invoiceNumber}
                    </Link>
                    <p className="mt-1 text-sm text-foreground">
                      {i.description ?? "—"}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-lg font-semibold tabular-nums text-foreground">
                    {formatIdr(i.amountIdr)}
                  </p>
                </div>

                {i.bankNameSnapshot ? (
                  <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Bank
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {i.bankNameSnapshot}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Nomor rekening
                      </dt>
                      <dd className="mt-1 text-sm tabular-nums text-foreground">
                        {i.accountNumberSnapshot}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Atas nama
                      </dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {i.accountHolderNameSnapshot}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Payment details pending — please contact GDI.
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-subtle">
                  <ClientInvoiceStatusBadge status={i.status} />
                  <span>
                    Due {i.dueAt ? i.dueAt.toLocaleDateString() : "—"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-10 text-base font-semibold text-foreground">
        All invoices
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Number</th>
              <th className="px-4 py-2 text-left font-medium">Project</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
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
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((i) => (
                <tr
                  key={i.id}
                  className="border-t border-border hover:bg-brand-soft/60"
                >
                  <td className="px-4 py-2 font-medium text-foreground">
                    <Link
                      href={`/dashboard/invoices/${i.id}`}
                      className="hover:underline"
                    >
                      {i.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {i.projectId && i.projectName ? (
                      <Link
                        href={`/dashboard/projects/${i.projectId}`}
                        className="hover:underline"
                      >
                        {i.projectName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {i.description ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">
                    {formatIdr(i.amountIdr)}
                  </td>
                  <td className="px-4 py-2">
                    <ClientInvoiceStatusBadge status={i.status} />
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

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn";
}) {
  const valueClass =
    tone === "warn" ? "text-red-700" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
