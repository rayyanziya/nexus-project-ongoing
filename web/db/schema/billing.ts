import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { clients } from "./tenancy";
import { projects } from "./projects";
import { invoiceStatus } from "./enums";

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bankName: text("bank_name").notNull(),
    accountNumber: text("account_number").notNull(),
    accountHolderName: text("account_holder_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("bank_accounts_active_idx").on(t.isActive)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    invoiceNumber: text("invoice_number"),
    amountIdr: bigint("amount_idr", { mode: "number" }).notNull(),
    description: text("description"),
    status: invoiceStatus("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidMethod: text("paid_method"),
    paidReference: text("paid_reference"),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
      onDelete: "restrict",
    }),
    bankNameSnapshot: text("bank_name_snapshot"),
    accountNumberSnapshot: text("account_number_snapshot"),
    accountHolderNameSnapshot: text("account_holder_name_snapshot"),
    createdByAdminId: text("created_by_admin_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("invoices_number_idx").on(t.invoiceNumber),
    index("invoices_client_idx").on(t.clientId),
    index("invoices_project_idx").on(t.projectId),
    index("invoices_bank_account_idx").on(t.bankAccountId),
  ],
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceIdr: bigint("unit_price_idr", { mode: "number" }).notNull(),
    totalIdr: bigint("total_idr", { mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("invoice_line_items_invoice_idx").on(t.invoiceId)],
);
