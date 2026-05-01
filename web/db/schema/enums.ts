import { pgEnum } from "drizzle-orm/pg-core";

export const clientStatus = pgEnum("client_status", [
  "active",
  "suspended",
  "archived",
]);

export const clientUserRole = pgEnum("client_user_role", [
  "owner",
  "member",
]);

export const clientUserStatus = pgEnum("client_user_status", [
  "provisioned",
  "active",
  "suspended",
  "archived",
]);

export const projectStatus = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "delivered",
  "archived",
]);

export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "overdue",
  "void",
]);

export const auditActorType = pgEnum("audit_actor_type", [
  "client",
  "admin",
  "system",
]);

export const commentAuthorType = pgEnum("comment_author_type", [
  "admin",
  "client",
]);

export const notificationRecipientType = pgEnum("notification_recipient_type", [
  "admin",
  "client",
]);

export const notificationKind = pgEnum("notification_kind", [
  "post_created",
  "comment_created",
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
