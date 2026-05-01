import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bankAccounts,
  clients,
  invoiceLineItems,
  invoices,
  projects,
} from "@/db/schema";
import {
  INTERNAL_PROJECT_CODE,
  nextDocumentNumber,
} from "@/lib/document-numbering";

export type Invoice = typeof invoices.$inferSelect;
export type InvoiceStatus = Invoice["status"];
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

export type InvoiceWithRefs = Invoice & {
  clientName: string;
  clientSlug: string;
  projectName: string | null;
};

const invoiceWithRefsColumns = {
  id: invoices.id,
  clientId: invoices.clientId,
  projectId: invoices.projectId,
  invoiceNumber: invoices.invoiceNumber,
  amountIdr: invoices.amountIdr,
  description: invoices.description,
  status: invoices.status,
  issuedAt: invoices.issuedAt,
  dueAt: invoices.dueAt,
  paidAt: invoices.paidAt,
  paidMethod: invoices.paidMethod,
  paidReference: invoices.paidReference,
  bankAccountId: invoices.bankAccountId,
  bankNameSnapshot: invoices.bankNameSnapshot,
  accountNumberSnapshot: invoices.accountNumberSnapshot,
  accountHolderNameSnapshot: invoices.accountHolderNameSnapshot,
  createdByAdminId: invoices.createdByAdminId,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
  deletedAt: invoices.deletedAt,
  clientName: clients.name,
  clientSlug: clients.slug,
  projectName: projects.name,
};

export async function listInvoices(): Promise<InvoiceWithRefs[]> {
  return db
    .select(invoiceWithRefsColumns)
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(isNull(invoices.deletedAt))
    .orderBy(desc(invoices.createdAt));
}

export async function listInvoicesForClient(
  clientId: string,
): Promise<InvoiceWithRefs[]> {
  return db
    .select(invoiceWithRefsColumns)
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(
      and(
        eq(invoices.clientId, clientId),
        isNull(invoices.deletedAt),
        inArray(invoices.status, ["issued", "paid", "overdue"]),
      ),
    )
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(
  id: string,
): Promise<InvoiceWithRefs | null> {
  const [row] = await db
    .select(invoiceWithRefsColumns)
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getInvoiceForClient(input: {
  invoiceId: string;
  clientId: string;
}): Promise<InvoiceWithRefs | null> {
  const [row] = await db
    .select(invoiceWithRefsColumns)
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(
      and(
        eq(invoices.id, input.invoiceId),
        eq(invoices.clientId, input.clientId),
        isNull(invoices.deletedAt),
        inArray(invoices.status, ["issued", "paid", "overdue"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function loadProjectCode(
  projectId: string | null,
): Promise<string> {
  if (!projectId) return INTERNAL_PROJECT_CODE;
  const [row] = await db
    .select({ code: projects.code })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!row) {
    throw new Error(`Project ${projectId} not found`);
  }
  return row.code;
}

export async function createInvoice(input: {
  clientId: string;
  projectId?: string | null;
  amountIdr: number;
  description?: string | null;
  bankAccountId?: string | null;
  createdByAdminId: string;
}): Promise<Invoice> {
  const [row] = await db
    .insert(invoices)
    .values({
      clientId: input.clientId,
      projectId: input.projectId ?? null,
      amountIdr: input.amountIdr,
      description: input.description ?? null,
      bankAccountId: input.bankAccountId ?? null,
      createdByAdminId: input.createdByAdminId,
    })
    .returning();
  return row;
}

export async function updateInvoice(
  id: string,
  patch: {
    projectId?: string | null;
    amountIdr?: number;
    description?: string | null;
    status?: InvoiceStatus;
    issuedAt?: Date | null;
    dueAt?: Date | null;
    paidAt?: Date | null;
    paidMethod?: string | null;
    paidReference?: string | null;
    bankAccountId?: string | null;
    bankNameSnapshot?: string | null;
    accountNumberSnapshot?: string | null;
    accountHolderNameSnapshot?: string | null;
  },
): Promise<Invoice | null> {
  const [row] = await db
    .update(invoices)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
    .returning();
  return row ?? null;
}

export async function issueInvoice(
  id: string,
): Promise<{ ok: true; invoice: Invoice } | { ok: false; reason: string }> {
  const [current] = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      bankAccountId: invoices.bankAccountId,
      bankNameSnapshot: invoices.bankNameSnapshot,
      invoiceNumber: invoices.invoiceNumber,
      issuedAt: invoices.issuedAt,
      projectId: invoices.projectId,
    })
    .from(invoices)
    .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
    .limit(1);
  if (!current) return { ok: false, reason: "Invoice not found." };
  if (!current.bankAccountId) {
    return {
      ok: false,
      reason: "Pick a bank account before issuing this invoice.",
    };
  }

  const [account] = await db
    .select()
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.id, current.bankAccountId),
        isNull(bankAccounts.deletedAt),
      ),
    )
    .limit(1);
  if (!account) {
    return { ok: false, reason: "Selected bank account no longer exists." };
  }

  const issuedAt = current.issuedAt ?? new Date();

  const invoiceNumber =
    current.invoiceNumber ??
    (await nextDocumentNumber({
      docType: "INV",
      projectCode: await loadProjectCode(current.projectId),
      issuedAt,
    }));

  const snapshotPatch =
    current.bankNameSnapshot != null
      ? {}
      : {
          bankNameSnapshot: account.bankName,
          accountNumberSnapshot: account.accountNumber,
          accountHolderNameSnapshot: account.accountHolderName,
        };

  const [row] = await db
    .update(invoices)
    .set({
      status: "issued",
      issuedAt,
      invoiceNumber,
      ...snapshotPatch,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id))
    .returning();
  return { ok: true, invoice: row };
}

export async function softDeleteInvoice(id: string): Promise<void> {
  await db
    .update(invoices)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(invoices.id, id));
}

export async function listInvoiceLineItems(
  invoiceId: string,
): Promise<InvoiceLineItem[]> {
  return db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceLineItems.sortOrder), asc(invoiceLineItems.id));
}

export async function addInvoiceLineItem(input: {
  invoiceId: string;
  description: string;
  quantity: number;
  unitPriceIdr: number;
}): Promise<InvoiceLineItem> {
  const totalIdr = input.quantity * input.unitPriceIdr;
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${invoiceLineItems.sortOrder}), -1)` })
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, input.invoiceId));
  const sortOrder = (maxRow?.max ?? -1) + 1;
  const [row] = await db
    .insert(invoiceLineItems)
    .values({
      invoiceId: input.invoiceId,
      description: input.description,
      quantity: input.quantity,
      unitPriceIdr: input.unitPriceIdr,
      totalIdr,
      sortOrder,
    })
    .returning();
  return row;
}

export async function removeInvoiceLineItem(id: string): Promise<void> {
  await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, id));
}
