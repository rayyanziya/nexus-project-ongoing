import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { clientUsers } from "./tenancy";
import { projectPosts, postComments } from "./feed";
import { notificationKind, notificationRecipientType } from "./enums";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    recipientType: notificationRecipientType("recipient_type").notNull(),
    recipientAdminId: text("recipient_admin_id"),
    recipientClientUserId: uuid("recipient_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "cascade" },
    ),
    kind: notificationKind("kind").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => projectPosts.id, {
      onDelete: "cascade",
    }),
    commentId: uuid("comment_id").references(() => postComments.id, {
      onDelete: "cascade",
    }),
    actorAdminId: text("actor_admin_id"),
    actorClientUserId: uuid("actor_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "cascade" },
    ),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_client_unread_idx").on(
      t.recipientClientUserId,
      t.readAt,
      t.createdAt,
    ),
    index("notifications_admin_unread_idx").on(
      t.recipientAdminId,
      t.readAt,
      t.createdAt,
    ),
    check(
      "notifications_recipient_union",
      sql`(${t.recipientType} = 'admin' AND ${t.recipientAdminId} IS NOT NULL AND ${t.recipientClientUserId} IS NULL)
       OR (${t.recipientType} = 'client' AND ${t.recipientClientUserId} IS NOT NULL AND ${t.recipientAdminId} IS NULL)`,
    ),
  ],
);
