"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import {
  markAllReadForClientUser,
  markNotificationReadForClientUser,
} from "@/lib/queries/notifications";

export async function markReadAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;
  const { clientUser } = await requireClient();
  await markNotificationReadForClientUser({
    notificationId: id,
    clientUserId: clientUser.id,
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}

export async function markAllReadAction(): Promise<void> {
  const { clientUser } = await requireClient();
  await markAllReadForClientUser(clientUser.id);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}
