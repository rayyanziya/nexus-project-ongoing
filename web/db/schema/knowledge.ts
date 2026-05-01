import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { projectPosts } from "./feed";

export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => projectPosts.id, {
      onDelete: "set null",
    }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    r2Key: text("r2_key").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    forAiContext: boolean("for_ai_context").notNull().default(false),
    clientVisible: boolean("client_visible").notNull().default(false),
    extractedText: text("extracted_text"),
    anthropicFileId: text("anthropic_file_id"),
    uploadedByAdminId: text("uploaded_by_admin_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("project_files_project_idx").on(t.projectId),
    index("project_files_ai_idx").on(t.projectId, t.forAiContext),
    index("project_files_visible_idx").on(t.projectId, t.clientVisible),
    index("project_files_post_idx").on(t.postId),
  ],
);

export const projectNotes = pgTable(
  "project_notes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    forAiContext: boolean("for_ai_context").notNull().default(false),
    clientVisible: boolean("client_visible").notNull().default(false),
    createdByAdminId: text("created_by_admin_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("project_notes_project_idx").on(t.projectId)],
);
