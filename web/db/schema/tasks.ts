import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { taskPriority, taskStatus } from "./enums";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    status: taskStatus("status").notNull().default("todo"),
    priority: taskPriority("priority").notNull().default("medium"),
    assigneeAdminId: text("assignee_admin_id"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdByAdminId: text("created_by_admin_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_project_status_idx").on(t.projectId, t.status, t.sortOrder),
    index("tasks_assignee_idx").on(t.assigneeAdminId),
    index("tasks_due_idx").on(t.dueAt),
  ],
);
