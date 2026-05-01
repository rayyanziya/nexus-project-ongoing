"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth";
import {
  createClient,
  softDeleteClient,
  updateClientName,
} from "@/lib/queries/clients";
import { logAdminAction } from "@/lib/audit";

export async function createClientAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const client = await createClient({ name });
  await logAdminAction({
    action: "client.create",
    targetType: "client",
    targetId: client.id,
    metadata: { name: client.name, slug: client.slug },
  });
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export type InviteState = { ok: boolean; message: string } | null;

export async function inviteClientUserAction(
  clientId: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { ok: false, message: "Email is required." };

  try {
    const h = await headers();
    const host = h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${protocol}://${host}`;

    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { client_id: clientId },
      redirectUrl: `${baseUrl}/sign-up`,
      ignoreExisting: true,
    });

    await logAdminAction({
      action: "client_user.invite",
      targetType: "client",
      targetId: clientId,
      metadata: { email, invitationId: invitation.id },
    });

    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true, message: `Invitation sent to ${email}.` };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to send invitation.";
    return { ok: false, message };
  }
}

export async function updateClientNameAction(
  clientId: string,
  formData: FormData,
) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const updated = await updateClientName(clientId, name);
  if (!updated) return;

  await logAdminAction({
    action: "client.update",
    targetType: "client",
    targetId: clientId,
    metadata: { name: updated.name },
  });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteClientAction(clientId: string) {
  await requireAdmin();
  await softDeleteClient(clientId);
  await logAdminAction({
    action: "client.delete",
    targetType: "client",
    targetId: clientId,
  });
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}
