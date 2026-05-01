"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import {
  createTask,
  softDeleteTask,
  updateTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/queries/tasks";

const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
] as const satisfies ReadonlyArray<TaskStatus>;

const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const satisfies ReadonlyArray<TaskPriority>;

function isStatus(v: string): v is TaskStatus {
  return (TASK_STATUSES as ReadonlyArray<string>).includes(v);
}

function isPriority(v: string): v is TaskPriority {
  return (TASK_PRIORITIES as ReadonlyArray<string>).includes(v);
}

function parseDate(v: FormDataEntryValue | null): Date | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length === 0 ? null : s;
}

export async function createTaskAction(
  projectId: string,
  formData: FormData,
): Promise<void> {
  const { clerkUserId } = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const statusRaw = String(formData.get("status") ?? "todo");
  const priorityRaw = String(formData.get("priority") ?? "medium");
  const status: TaskStatus = isStatus(statusRaw) ? statusRaw : "todo";
  const priority: TaskPriority = isPriority(priorityRaw)
    ? priorityRaw
    : "medium";

  const task = await createTask({
    projectId,
    title,
    body: nullable(formData.get("body")),
    status,
    priority,
    assigneeAdminId: nullable(formData.get("assigneeAdminId")),
    dueAt: parseDate(formData.get("dueAt")),
    createdByAdminId: clerkUserId,
  });

  await logAdminAction({
    action: "task.create",
    targetType: "task",
    targetId: task.id,
    metadata: { projectId, title, status, priority },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/tasks");
}

export async function updateTaskAction(
  projectId: string,
  taskId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const patch: Parameters<typeof updateTask>[1] = {};

  const title = formData.get("title");
  if (title !== null) {
    const t = String(title).trim();
    if (t.length > 0) patch.title = t;
  }

  const body = formData.get("body");
  if (body !== null) patch.body = nullable(body);

  const status = formData.get("status");
  if (status !== null) {
    const s = String(status);
    if (isStatus(s)) patch.status = s;
  }

  const priority = formData.get("priority");
  if (priority !== null) {
    const p = String(priority);
    if (isPriority(p)) patch.priority = p;
  }

  const assignee = formData.get("assigneeAdminId");
  if (assignee !== null) patch.assigneeAdminId = nullable(assignee);

  const dueAt = formData.get("dueAt");
  if (dueAt !== null) patch.dueAt = parseDate(dueAt);

  const updated = await updateTask(taskId, patch);
  if (!updated) return;

  await logAdminAction({
    action: "task.update",
    targetType: "task",
    targetId: taskId,
    metadata: { projectId, patch },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/tasks");
}

export async function deleteTaskAction(
  projectId: string,
  taskId: string,
): Promise<void> {
  await requireAdmin();
  await softDeleteTask(taskId);
  await logAdminAction({
    action: "task.delete",
    targetType: "task",
    targetId: taskId,
    metadata: { projectId },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/tasks");
}
