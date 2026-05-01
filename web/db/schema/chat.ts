import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { clientUsers } from "./tenancy";
import { messageRole } from "./enums";

export const projectConversations = pgTable(
  "project_conversations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientUserId: uuid("client_user_id")
      .notNull()
      .references(() => clientUsers.id, { onDelete: "cascade" }),
    containerId: text("container_id"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("project_conv_unique_idx").on(t.projectId, t.clientUserId),
  ],
);

export const projectMessages = pgTable(
  "project_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => projectConversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: jsonb("content").notNull(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheCreationTokens: integer("cache_creation_tokens"),
    model: text("model"),
    cacheHit: boolean("cache_hit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_messages_conv_idx").on(t.conversationId, t.createdAt)],
);

export const conversationOutputs = pgTable(
  "conversation_outputs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => projectConversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => projectMessages.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    r2Key: text("r2_key").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    anthropicFileId: text("anthropic_file_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("conversation_outputs_message_idx").on(t.messageId),
    index("conversation_outputs_conv_idx").on(t.conversationId),
  ],
);
