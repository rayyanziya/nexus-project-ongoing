import type {
  InvoiceLineItem,
  InvoiceWithRefs,
} from "@/lib/queries/invoices";
import { formatIdr } from "@/lib/format";

const GDI_LEGAL_NAME = "PT GLOBAL DATAVERSE INDONESIA";
const GDI_TAGLINE = "AI-First Enterprise Systems Integrator";
const GDI_ADDRESS_LINES = [
  "Jl. Banda No. 30, Graha Pos Indonesia, Lt. 2 Blok C",
  "Bandung, Jawa Barat 40115, Indonesia",
];
const GDI_WEBSITE = "www.dataverse.co.id";
const GDI_NIB = "1903240102267";
const GDI_SK_KEMENKUMHAM = "AHU-0019164.AH.01.01.TAHUN 2024";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function InvoicePrint({
  invoice,
  lineItems,
  showPaymentDetails = true,
}: {
  invoice: InvoiceWithRefs;
  lineItems: InvoiceLineItem[];
  showPaymentDetails?: boolean;
}) {
  const hasLineItems = lineItems.length > 0;
  const lineItemTotal = lineItems.reduce((s, li) => s + li.totalIdr, 0);

  return (
    <main className="mx-auto w-full max-w-4xl bg-white px-10 py-12 text-sm text-black">
      <style>{`@media print { @page { margin: 0; } }`}</style>
      <header className="flex items-start justify-between border-b-2 border-black pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{GDI_LEGAL_NAME}</h1>
          <p className="mt-1 text-xs italic text-neutral-600">{GDI_TAGLINE}</p>
          <div className="mt-3 text-xs leading-relaxed">
            {GDI_ADDRESS_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>{GDI_WEBSITE}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            Invoice
          </p>
          <p className="mt-1 font-mono text-base font-semibold">
            {invoice.invoiceNumber ?? "DRAFT"}
          </p>
          <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-xs">
            <dt className="text-neutral-600">Tanggal terbit</dt>
            <dd className="text-right">{formatDate(invoice.issuedAt)}</dd>
            <dt className="text-neutral-600">Jatuh tempo</dt>
            <dd className="text-right">{formatDate(invoice.dueAt)}</dd>
          </dl>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            Ditagihkan kepada
          </p>
          <p className="mt-1 text-base font-semibold">{invoice.clientName}</p>
          {invoice.projectName && (
            <p className="mt-1 text-xs text-neutral-600">
              Proyek: {invoice.projectName}
            </p>
          )}
        </div>
        {invoice.description && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
              Keterangan
            </p>
            <p className="mt-1">{invoice.description}</p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-xs uppercase tracking-widest">
              <th className="py-2 text-left font-medium">Deskripsi</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Harga satuan</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {hasLineItems ? (
              lineItems.map((li) => (
                <tr key={li.id} className="border-b border-neutral-200">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2 text-right tabular-nums">
                    {li.quantity}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatIdr(li.unitPriceIdr)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatIdr(li.totalIdr)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-neutral-200">
                <td className="py-2" colSpan={3}>
                  {invoice.description ?? "Jasa profesional"}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatIdr(invoice.amountIdr)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {hasLineItems && lineItemTotal !== invoice.amountIdr && (
              <tr className="text-xs text-neutral-600">
                <td colSpan={3} className="pt-2 text-right">
                  Subtotal item
                </td>
                <td className="pt-2 text-right tabular-nums">
                  {formatIdr(lineItemTotal)}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-black font-semibold">
              <td colSpan={3} className="py-2 text-right uppercase tracking-widest">
                Total
              </td>
              <td className="py-2 text-right text-base tabular-nums">
                {formatIdr(invoice.amountIdr)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {showPaymentDetails && invoice.bankNameSnapshot && (
        <section className="mt-8 border border-neutral-300 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            Pembayaran via transfer bank
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-600">Bank</dt>
              <dd className="mt-0.5 font-medium">
                {invoice.bankNameSnapshot}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-600">Nomor rekening</dt>
              <dd className="mt-0.5 font-mono tabular-nums">
                {invoice.accountNumberSnapshot}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-600">Atas nama</dt>
              <dd className="mt-0.5 font-medium">
                {invoice.accountHolderNameSnapshot}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-neutral-600">
            Mohon mencantumkan nomor invoice{" "}
            <span className="font-mono">
              {invoice.invoiceNumber ?? "—"}
            </span>{" "}
            sebagai keterangan transfer.
          </p>
        </section>
      )}

      <footer className="mt-12 border-t border-neutral-300 pt-4 text-[10px] text-neutral-600">
        <div className="flex justify-between">
          <span>NIB: {GDI_NIB}</span>
          <span>SK Kemenkumham: {GDI_SK_KEMENKUMHAM}</span>
          <span>{GDI_WEBSITE}</span>
        </div>
      </footer>
    </main>
  );
}
