import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { clientUsers } from "./tenancy";
import { commentAuthorType } from "./enums";

export const projectPosts = pgTable(
  "project_posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorAdminId: text("author_admin_id").notNull(),
    body: text("body"),
    forAiContext: boolean("for_ai_context").notNull().default(false),
    clientVisible: boolean("client_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("project_posts_project_created_idx").on(t.projectId, t.createdAt),
    index("project_posts_project_visible_idx").on(t.projectId, t.clientVisible),
    index("project_posts_project_ai_idx").on(t.projectId, t.forAiContext),
  ],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    postId: uuid("post_id")
      .notNull()
      .references(() => projectPosts.id, { onDelete: "cascade" }),
    parentCommentId: uuid("parent_comment_id"),
    authorType: commentAuthorType("author_type").notNull(),
    authorAdminId: text("author_admin_id"),
    authorClientUserId: uuid("author_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "cascade" },
    ),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("post_comments_post_created_idx").on(t.postId, t.createdAt),
    index("post_comments_parent_idx").on(t.parentCommentId),
    foreignKey({
      columns: [t.parentCommentId],
      foreignColumns: [t.id],
      name: "post_comments_parent_fkey",
    }).onDelete("cascade"),
    check(
      "post_comments_author_union",
      sql`(${t.authorType} = 'admin' AND ${t.authorAdminId} IS NOT NULL AND ${t.authorClientUserId} IS NULL)
       OR (${t.authorType} = 'client' AND ${t.authorClientUserId} IS NOT NULL AND ${t.authorAdminId} IS NULL)`,
    ),
  ],
);
