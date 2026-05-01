import Link from "next/link";
import {
  unreadCountForAdmin,
  unreadCountForClientUser,
} from "@/lib/queries/notifications";

type Props =
  | { viewerKind: "admin"; clerkUserId: string }
  | { viewerKind: "client"; clientUserId: string };

export async function NotificationBell(props: Props) {
  const unread =
    props.viewerKind === "admin"
      ? await unreadCountForAdmin(props.clerkUserId)
      : await unreadCountForClientUser(props.clientUserId);
  const href =
    props.viewerKind === "admin"
      ? "/admin/notifications"
      : "/dashboard/notifications";
  const label =
    unread === 0
      ? "Notifications"
      : `Notifications (${unread} unread)`;

  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-[1.05rem] text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
