import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import {
  getInvoiceForClient,
  listInvoiceLineItems,
} from "@/lib/queries/invoices";
import { InvoicePrint } from "@/app/_components/invoice-print";
import { PrintButton } from "@/app/_components/print-button";

export default async function ClientInvoicePrintPage({
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

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-end px-10 pt-6 print:hidden">
        <PrintButton />
      </div>
      <InvoicePrint
        invoice={invoice}
        lineItems={lineItems}
        showPaymentDetails={false}
      />
    </div>
  );
}
