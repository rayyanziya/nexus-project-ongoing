"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createProject,
  isProjectCodeTaken,
  softDeleteProject,
  updateProject,
  type ProjectStatus,
} from "@/lib/queries/projects";
import {
  addProjectMember,
  removeProjectMember,
} from "@/lib/queries/project-members";
import { logAdminAction } from "@/lib/audit";
import {
  INTERNAL_PROJECT_CODE,
  isValidProjectCode,
  suggestProjectCode,
} from "@/lib/document-numbering";

const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "delivered",
  "archived",
] as const satisfies ReadonlyArray<ProjectStatus>;

function isValidStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as ReadonlyArray<string>).includes(value);
}

export async function createProjectAction(formData: FormData) {
  await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const codeRaw = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!clientId || !name) return;

  const code = codeRaw || suggestProjectCode(name);
  if (!isValidProjectCode(code)) {
    throw new Error(
      "Project code must be exactly 3 letters (A–Z). Auto-suggestion failed; enter one manually.",
    );
  }
  if (code === INTERNAL_PROJECT_CODE) {
    throw new Error(
      `"${INTERNAL_PROJECT_CODE}" is reserved for internal documents and cannot be used as a project code.`,
    );
  }
  if (await isProjectCodeTaken(code)) {
    throw new Error(`Project code "${code}" is already in use.`);
  }

  const project = await createProject({ clientId, code, name });
  await logAdminAction({
    action: "project.create",
    targetType: "project",
    targetId: project.id,
    metadata: { name: project.name, code: project.code, clientId },
  });
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${project.id}`);
}

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function updateProjectAction(
  projectId: string,
  formData: FormData,
) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!name || !isValidStatus(status)) return;

  const startedAt = parseDateInput(formData.get("startedAt"));
  const expectedDeliveryAt = parseDateInput(
    formData.get("expectedDeliveryAt"),
  );
  let deliveredAt = parseDateInput(formData.get("deliveredAt"));
  if (status === "delivered" && !deliveredAt) deliveredAt = new Date();
  if (status !== "delivered") deliveredAt = null;

  const updated = await updateProject(projectId, {
    name,
    description: description || null,
    status,
    startedAt,
    expectedDeliveryAt,
    deliveredAt,
  });
  if (!updated) return;

  await logAdminAction({
    action: "project.update",
    targetType: "project",
    targetId: projectId,
    metadata: { name: updated.name, status: updated.status },
  });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: string) {
  await requireAdmin();
  await softDeleteProject(projectId);
  await logAdminAction({
    action: "project.delete",
    targetType: "project",
    targetId: projectId,
  });
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function addMemberAction(
  projectId: string,
  formData: FormData,
) {
  await requireAdmin();
  const clientUserId = String(formData.get("clientUserId") ?? "").trim();
  if (!clientUserId) return;

  await addProjectMember({ projectId, clientUserId });
  await logAdminAction({
    action: "project_member.add",
    targetType: "project",
    targetId: projectId,
    metadata: { clientUserId },
  });
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function removeMemberAction(
  projectId: string,
  clientUserId: string,
) {
  await requireAdmin();
  await removeProjectMember({ projectId, clientUserId });
  await logAdminAction({
    action: "project_member.remove",
    targetType: "project",
    targetId: projectId,
    metadata: { clientUserId },
  });
  revalidatePath(`/admin/projects/${projectId}`);
}
