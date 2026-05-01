const STYLES: Record<string, string> = {
  planning: "bg-border/60 text-muted ring-1 ring-border-strong",
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  delivered: "bg-brand-soft text-brand ring-1 ring-brand/30",
  archived: "bg-border/40 text-subtle ring-1 ring-border",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const className = STYLES[status] ?? STYLES.planning;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
