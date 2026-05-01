import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  clientUsers,
  notifications,
  projectPosts,
  projects,
} from "@/db/schema";
import { listProjectMembers } from "./project-members";

export type Notification = typeof notifications.$inferSelect;
export type NotificationKind = Notification["kind"];

export type NotificationRow = Notification & {
  projectName: string;
  postBodyExcerpt: string | null;
  actorDisplayName: string;
};

const ADMIN_DISPLAY_NAME = "GDI";
const POST_EXCERPT_CHARS = 140;

type Actor =
  | { kind: "admin"; clerkUserId: string }
  | { kind: "client"; clientUserId: string };

type FanOutInput = {
  kind: NotificationKind;
  projectId: string;
  postId: string | null;
  commentId: string | null;
  actor: Actor;
};

export async function createNotificationsForProjectClients(
  input: FanOutInput,
): Promise<void> {
  const members = await listProjectMembers(input.projectId);
  const recipients = members.filter(
    (m) =>
      input.actor.kind !== "client" || m.id !== input.actor.clientUserId,
  );
  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((m) => ({
      recipientType: "client" as const,
      recipientAdminId: null,
      recipientClientUserId: m.id,
      kind: input.kind,
      projectId: input.projectId,
      postId: input.postId,
      commentId: input.commentId,
      actorAdminId: input.actor.kind === "admin" ? input.actor.clerkUserId : null,
      actorClientUserId:
        input.actor.kind === "client" ? input.actor.clientUserId : null,
    })),
  );
}

export async function createNotificationsForAdmins(
  input: FanOutInput,
): Promise<void> {
  const clerk = await clerkClient();
  const { data } = await clerk.users.getUserList({ limit: 200 });
  const adminIds = data
    .filter((u) => (u.publicMetadata as { role?: string } | null)?.role === "admin")
    .map((u) => u.id)
    .filter(
      (id) =>
        input.actor.kind !== "admin" || id !== input.actor.clerkUserId,
    );
  if (adminIds.length === 0) return;

  await db.insert(notifications).values(
    adminIds.map((id) => ({
      recipientType: "admin" as const,
      recipientAdminId: id,
      recipientClientUserId: null,
      kind: input.kind,
      projectId: input.projectId,
      postId: input.postId,
      commentId: input.commentId,
      actorAdminId: input.actor.kind === "admin" ? input.actor.clerkUserId : null,
      actorClientUserId:
        input.actor.kind === "client" ? input.actor.clientUserId : null,
    })),
  );
}

const listColumns = {
  id: notifications.id,
  recipientType: notifications.recipientType,
  recipientAdminId: notifications.recipientAdminId,
  recipientClientUserId: notifications.recipientClientUserId,
  kind: notifications.kind,
  projectId: notifications.projectId,
  postId: notifications.postId,
  commentId: notifications.commentId,
  actorAdminId: notifications.actorAdminId,
  actorClientUserId: notifications.actorClientUserId,
  readAt: notifications.readAt,
  createdAt: notifications.createdAt,
  projectName: projects.name,
  postBody: projectPosts.body,
  actorClientName: clientUsers.fullName,
  actorClientEmail: clientUsers.email,
};

function excerpt(body: string | null): string | null {
  if (!body) return null;
  const trimmed = body.trim();
  if (trimmed.length <= POST_EXCERPT_CHARS) return trimmed;
  return `${trimmed.slice(0, POST_EXCERPT_CHARS).trimEnd()}…`;
}

function shapeRow(r: {
  id: string;
  recipientType: Notification["recipientType"];
  recipientAdminId: string | null;
  recipientClientUserId: string | null;
  kind: NotificationKind;
  projectId: string;
  postId: string | null;
  commentId: string | null;
  actorAdminId: string | null;
  actorClientUserId: string | null;
  readAt: Date | null;
  createdAt: Date;
  projectName: string;
  postBody: string | null;
  actorClientName: string | null;
  actorClientEmail: string | null;
}): NotificationRow {
  const actorDisplayName = r.actorAdminId
    ? ADMIN_DISPLAY_NAME
    : r.actorClientName?.trim() || r.actorClientEmail || "Client";
  return {
    id: r.id,
    recipientType: r.recipientType,
    recipientAdminId: r.recipientAdminId,
    recipientClientUserId: r.recipientClientUserId,
    kind: r.kind,
    projectId: r.projectId,
    postId: r.postId,
    commentId: r.commentId,
    actorAdminId: r.actorAdminId,
    actorClientUserId: r.actorClientUserId,
    readAt: r.readAt,
    createdAt: r.createdAt,
    projectName: r.projectName,
    postBodyExcerpt: excerpt(r.postBody),
    actorDisplayName,
  };
}

const DEFAULT_LIMIT = 50;

export async function listNotificationsForAdmin(
  clerkUserId: string,
  options: { limit?: number } = {},
): Promise<NotificationRow[]> {
  const rows = await db
    .select(listColumns)
    .from(notifications)
    .innerJoin(projects, eq(notifications.projectId, projects.id))
    .leftJoin(projectPosts, eq(notifications.postId, projectPosts.id))
    .leftJoin(clientUsers, eq(notifications.actorClientUserId, clientUsers.id))
    .where(eq(notifications.recipientAdminId, clerkUserId))
    .orderBy(desc(notifications.createdAt))
    .limit(options.limit ?? DEFAULT_LIMIT);
  return rows.map(shapeRow);
}

export async function listNotificationsForClientUser(
  clientUserId: string,
  options: { limit?: number } = {},
): Promise<NotificationRow[]> {
  const rows = await db
    .select(listColumns)
    .from(notifications)
    .innerJoin(projects, eq(notifications.projectId, projects.id))
    .leftJoin(projectPosts, eq(notifications.postId, projectPosts.id))
    .leftJoin(clientUsers, eq(notifications.actorClientUserId, clientUsers.id))
    .where(eq(notifications.recipientClientUserId, clientUserId))
    .orderBy(desc(notifications.createdAt))
    .limit(options.limit ?? DEFAULT_LIMIT);
  return rows.map(shapeRow);
}

export async function unreadCountForAdmin(
  clerkUserId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientAdminId, clerkUserId),
        isNull(notifications.readAt),
      ),
    );
  return row?.value ?? 0;
}

export async function unreadCountForClientUser(
  clientUserId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientClientUserId, clientUserId),
        isNull(notifications.readAt),
      ),
    );
  return row?.value ?? 0;
}

export async function markNotificationReadForAdmin(input: {
  notificationId: string;
  clerkUserId: string;
}): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.recipientAdminId, input.clerkUserId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markNotificationReadForClientUser(input: {
  notificationId: string;
  clientUserId: string;
}): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.recipientClientUserId, input.clientUserId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markAllReadForAdmin(clerkUserId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(
      and(
        eq(notifications.recipientAdminId, clerkUserId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markAllReadForClientUser(
  clientUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(
      and(
        eq(notifications.recipientClientUserId, clientUserId),
        isNull(notifications.readAt),
      ),
    );
}
