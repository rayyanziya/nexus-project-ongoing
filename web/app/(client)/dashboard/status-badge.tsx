import { StatusBadge } from "@/app/_components/status-badge";

const STYLES = {
  planning: "bg-border/60 text-muted ring-1 ring-border-strong",
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  delivered: "bg-brand-soft text-brand ring-1 ring-brand/30",
  archived: "bg-border/40 text-subtle ring-1 ring-border",
} as const;

type ProjectStatus = keyof typeof STYLES;

export function ProjectStatusBadge({ status }: { status: string }) {
  const safeStatus = (status in STYLES ? status : "planning") as ProjectStatus;
  return (
    <StatusBadge
      status={safeStatus}
      styles={STYLES}
      fallback="planning"
      shape="pill"
      label={safeStatus.replace("_", " ")}
    />
  );
}
