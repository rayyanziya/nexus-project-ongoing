import { StatusBadge } from "@/app/_components/status-badge";

const STYLES = {
  issued: "bg-brand-soft text-brand ring-1 ring-brand/30",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
} as const;

type ClientInvoiceStatus = keyof typeof STYLES;

export function ClientInvoiceStatusBadge({ status }: { status: string }) {
  const safeStatus = (
    status in STYLES ? status : "issued"
  ) as ClientInvoiceStatus;
  return (
    <StatusBadge
      status={safeStatus}
      styles={STYLES}
      fallback="issued"
      shape="square"
    />
  );
}
