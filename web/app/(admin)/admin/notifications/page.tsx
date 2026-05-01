import { requireAdmin } from "@/lib/auth";
import { listNotificationsForAdmin } from "@/lib/queries/notifications";
import { NotificationsList } from "@/app/_components/notifications-list";
import { markAllReadAction, markReadAction } from "./actions";

export default async function AdminNotificationsPage() {
  const { clerkUserId } = await requireAdmin();
  const rows = await listNotificationsForAdmin(clerkUserId);
  return (
    <NotificationsList
      rows={rows}
      viewerKind="admin"
      markReadAction={markReadAction}
      markAllReadAction={markAllReadAction}
    />
  );
}
