const STYLES: Record<string, string> = {
  draft: "bg-border/60 text-muted ring-1 ring-border-strong",
  issued: "bg-brand-soft text-brand ring-1 ring-brand/30",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
  void: "bg-border/40 text-subtle ring-1 ring-border",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const className = STYLES[status] ?? STYLES.draft;
  return (
    <span
      className={`shrink-0 rounded-sm px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}
