import type { NotificationRow } from "@/lib/queries/notifications";

type ViewerKind = "admin" | "client";

const KIND_LABEL: Record<NotificationRow["kind"], string> = {
  post_created: "posted an update",
  comment_created: "commented",
};

function projectHrefBase(viewerKind: ViewerKind): string {
  return viewerKind === "admin" ? "/admin/projects" : "/dashboard/projects";
}

function notificationHref(
  viewerKind: ViewerKind,
  n: NotificationRow,
): string {
  const base = `${projectHrefBase(viewerKind)}/${n.projectId}`;
  return n.postId ? `${base}#post-${n.postId}` : base;
}

function relativeTime(d: Date): string {
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export function NotificationsList({
  rows,
  viewerKind,
  markReadAction,
  markAllReadAction,
}: {
  rows: NotificationRow[];
  viewerKind: ViewerKind;
  markReadAction: (formData: FormData) => Promise<void>;
  markAllReadAction: () => Promise<void>;
}) {
  const unread = rows.filter((r) => r.readAt === null).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-subtle">
            {unread === 0
              ? "You're all caught up."
              : `${unread} unread.`}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button
              type="submit"
              className="cursor-pointer rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center text-sm text-muted">
          No notifications yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((n) => {
            const isUnread = n.readAt === null;
            return (
              <li
                key={n.id}
                className={
                  isUnread
                    ? "px-4 py-3 transition-colors hover:bg-brand-soft/40"
                    : "px-4 py-3 opacity-70 transition-colors hover:bg-brand-soft/40"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={notificationHref(viewerKind, n)}
                    className="min-w-0 flex-1"
                  >
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{n.actorDisplayName}</span>{" "}
                      <span className="text-subtle">
                        {KIND_LABEL[n.kind]} on
                      </span>{" "}
                      <span className="font-medium">{n.projectName}</span>
                    </p>
                    {n.postBodyExcerpt && (
                      <p className="mt-1 truncate text-xs text-subtle">
                        {n.postBodyExcerpt}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted">
                      {relativeTime(n.createdAt)}
                    </p>
                  </a>
                  <div className="flex shrink-0 items-center gap-2">
                    {isUnread && (
                      <span
                        aria-label="unread"
                        className="h-2 w-2 rounded-full bg-brand"
                      />
                    )}
                    {isUnread && (
                      <form action={markReadAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-brand"
                        >
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
