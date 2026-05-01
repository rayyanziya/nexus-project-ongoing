import { StatusBadge } from "@/app/_components/status-badge";

const STYLES = {
  draft: "bg-border/60 text-muted ring-1 ring-border-strong",
  issued: "bg-brand-soft text-brand ring-1 ring-brand/30",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
  void: "bg-border/40 text-subtle ring-1 ring-border",
} as const;

type InvoiceStatus = keyof typeof STYLES;

export function InvoiceStatusBadge({ status }: { status: string }) {
  const safeStatus = (status in STYLES ? status : "draft") as InvoiceStatus;
  return (
    <StatusBadge
      status={safeStatus}
      styles={STYLES}
      fallback="draft"
      shape="square"
    />
  );
}
