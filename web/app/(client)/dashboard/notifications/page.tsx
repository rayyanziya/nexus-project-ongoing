import { requireClient } from "@/lib/auth";
import { listNotificationsForClientUser } from "@/lib/queries/notifications";
import { NotificationsList } from "@/app/_components/notifications-list";
import { markAllReadAction, markReadAction } from "./actions";

export default async function ClientNotificationsPage() {
  const { clientUser } = await requireClient();
  const rows = await listNotificationsForClientUser(clientUser.id);
  return (
    <NotificationsList
      rows={rows}
      viewerKind="client"
      markReadAction={markReadAction}
      markAllReadAction={markAllReadAction}
    />
  );
}
