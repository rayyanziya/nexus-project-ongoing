"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  markAllReadForAdmin,
  markNotificationReadForAdmin,
} from "@/lib/queries/notifications";

export async function markReadAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;
  const { clerkUserId } = await requireAdmin();
  await markNotificationReadForAdmin({
    notificationId: id,
    clerkUserId,
  });
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
}

export async function markAllReadAction(): Promise<void> {
  const { clerkUserId } = await requireAdmin();
  await markAllReadForAdmin(clerkUserId);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
}
