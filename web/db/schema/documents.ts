import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    docType: text("doc_type").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    documentNumber: text("document_number"),
    title: text("title").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    r2Key: text("r2_key"),
    filename: text("filename"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    createdByAdminId: text("created_by_admin_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("documents_number_idx").on(t.documentNumber),
    index("documents_type_idx").on(t.docType),
    index("documents_project_idx").on(t.projectId),
  ],
);
