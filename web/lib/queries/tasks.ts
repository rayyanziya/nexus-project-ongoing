import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, tasks } from "@/db/schema";

export type Task = typeof tasks.$inferSelect;
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];

export type TaskWithProject = Task & {
  projectName: string;
  projectCode: string;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
};

const taskWithProjectColumns = {
  id: tasks.id,
  projectId: tasks.projectId,
  title: tasks.title,
  body: tasks.body,
  status: tasks.status,
  priority: tasks.priority,
  assigneeAdminId: tasks.assigneeAdminId,
  dueAt: tasks.dueAt,
  sortOrder: tasks.sortOrder,
  createdByAdminId: tasks.createdByAdminId,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  deletedAt: tasks.deletedAt,
  projectName: projects.name,
  projectCode: projects.code,
};

const STATUS_RANK_SQL = sql`CASE ${tasks.status}
  WHEN 'todo' THEN 0
  WHEN 'in_progress' THEN 1
  WHEN 'in_review' THEN 2
  WHEN 'blocked' THEN 3
  WHEN 'done' THEN 4
END`;

const PRIORITY_RANK_SQL = sql`CASE ${tasks.priority}
  WHEN 'urgent' THEN 0
  WHEN 'high' THEN 1
  WHEN 'medium' THEN 2
  WHEN 'low' THEN 3
END`;

export async function listTasksForProject(projectId: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))
    .orderBy(STATUS_RANK_SQL, PRIORITY_RANK_SQL, asc(tasks.sortOrder), desc(tasks.createdAt));
}

export async function listTasksForAssignee(
  clerkUserId: string,
): Promise<TaskWithProject[]> {
  return db
    .select(taskWithProjectColumns)
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeAdminId, clerkUserId),
        isNull(tasks.deletedAt),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(STATUS_RANK_SQL, PRIORITY_RANK_SQL, asc(tasks.dueAt));
}

export async function listOpenTasks(): Promise<TaskWithProject[]> {
  return db
    .select(taskWithProjectColumns)
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        sql`${tasks.status} <> 'done'`,
        isNull(tasks.deletedAt),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(STATUS_RANK_SQL, PRIORITY_RANK_SQL, asc(tasks.dueAt));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function createTask(input: {
  projectId: string;
  title: string;
  body?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeAdminId?: string | null;
  dueAt?: Date | null;
  createdByAdminId: string;
}): Promise<Task> {
  const [row] = await db
    .insert(tasks)
    .values({
      projectId: input.projectId,
      title: input.title,
      body: input.body ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assigneeAdminId: input.assigneeAdminId ?? null,
      dueAt: input.dueAt ?? null,
      createdByAdminId: input.createdByAdminId,
    })
    .returning();
  return row;
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    body?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeAdminId?: string | null;
    dueAt?: Date | null;
  },
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteTask(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(tasks)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(tasks.id, id));
}

export async function listAdmins(): Promise<AdminUser[]> {
  const clerk = await clerkClient();
  const { data } = await clerk.users.getUserList({ limit: 200 });
  return data
    .filter(
      (u) => (u.publicMetadata as { role?: string } | null)?.role === "admin",
    )
    .map((u) => {
      const email =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
          ?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
      const fullName =
        [u.firstName, u.lastName].filter(Boolean).join(" ") || null;
      return { id: u.id, email, fullName };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}
