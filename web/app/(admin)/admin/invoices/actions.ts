"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import {
  addInvoiceLineItem,
  createInvoice,
  getInvoiceById,
  issueInvoice,
  removeInvoiceLineItem,
  softDeleteInvoice,
  updateInvoice,
  type InvoiceStatus,
} from "@/lib/queries/invoices";

const INVOICE_STATUSES = [
  "draft",
  "issued",
  "paid",
  "overdue",
  "void",
] as const satisfies ReadonlyArray<InvoiceStatus>;

function isValidStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as ReadonlyArray<string>).includes(value);
}

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createInvoiceAction(formData: FormData) {
  const { clerkUserId } = await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const projectIdRaw = String(formData.get("projectId") ?? "").trim();
  const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountIdr = parseAmount(formData.get("amountIdr"));
  if (!clientId || !bankAccountId || amountIdr === null) return;

  const invoice = await createInvoice({
    clientId,
    projectId: projectIdRaw || null,
    amountIdr,
    description: description || null,
    bankAccountId,
    createdByAdminId: clerkUserId,
  });
  await logAdminAction({
    action: "invoice.create",
    targetType: "invoice",
    targetId: invoice.id,
    metadata: {
      number: invoice.invoiceNumber,
      clientId,
      amountIdr,
      bankAccountId,
    },
  });
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  formData: FormData,
) {
  await requireAdmin();
  const current = await getInvoiceById(invoiceId);
  if (!current) return;

  const description = String(formData.get("description") ?? "").trim();
  const amountIdr = parseAmount(formData.get("amountIdr"));
  const status = String(formData.get("status") ?? "").trim();
  const projectIdRaw = String(formData.get("projectId") ?? "").trim();
  const submittedBankId = String(formData.get("bankAccountId") ?? "").trim();
  const bankAccountId = submittedBankId || current.bankAccountId;
  if (!bankAccountId || amountIdr === null || !isValidStatus(status)) {
    return;
  }

  const issuedAt = parseDateInput(formData.get("issuedAt"));
  const dueAt = parseDateInput(formData.get("dueAt"));

  const projectId = projectIdRaw || null;

  await updateInvoice(invoiceId, {
    projectId,
    amountIdr,
    description: description || null,
    issuedAt: issuedAt ?? current.issuedAt,
    dueAt,
    bankAccountId,
  });

  const movingToIssued = current.status === "draft" && status === "issued";
  if (movingToIssued) {
    const result = await issueInvoice(invoiceId);
    if (!result.ok) return;
  } else if (status !== current.status) {
    await updateInvoice(invoiceId, { status });
  }

  await logAdminAction({
    action: "invoice.update",
    targetType: "invoice",
    targetId: invoiceId,
    metadata: {
      status,
      bankAccountId,
      issuedViaUpdate: movingToIssued,
    },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function markInvoiceIssuedAction(
  invoiceId: string,
): Promise<{ ok: boolean; reason?: string }> {
  await requireAdmin();
  const result = await issueInvoice(invoiceId);
  if (!result.ok) return { ok: false, reason: result.reason };
  await logAdminAction({
    action: "invoice.issue",
    targetType: "invoice",
    targetId: invoiceId,
    metadata: {
      bankAccountId: result.invoice.bankAccountId,
      number: result.invoice.invoiceNumber,
    },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { ok: true };
}

export async function markInvoicePaidAction(
  invoiceId: string,
  formData: FormData,
) {
  await requireAdmin();
  const method = String(formData.get("paidMethod") ?? "").trim();
  const reference = String(formData.get("paidReference") ?? "").trim();
  if (!method) return;

  const updated = await updateInvoice(invoiceId, {
    status: "paid",
    paidAt: new Date(),
    paidMethod: method,
    paidReference: reference || null,
  });
  if (!updated) return;
  await logAdminAction({
    action: "invoice.pay",
    targetType: "invoice",
    targetId: invoiceId,
    metadata: { method, reference },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function voidInvoiceAction(invoiceId: string) {
  await requireAdmin();
  const updated = await updateInvoice(invoiceId, { status: "void" });
  if (!updated) return;
  await logAdminAction({
    action: "invoice.void",
    targetType: "invoice",
    targetId: invoiceId,
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function deleteInvoiceAction(invoiceId: string) {
  await requireAdmin();
  await softDeleteInvoice(invoiceId);
  await logAdminAction({
    action: "invoice.delete",
    targetType: "invoice",
    targetId: invoiceId,
  });
  revalidatePath("/admin/invoices");
  redirect("/admin/invoices");
}

export async function addInvoiceLineItemAction(
  invoiceId: string,
  formData: FormData,
) {
  await requireAdmin();
  const description = String(formData.get("description") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const unitPriceIdr = parseAmount(formData.get("unitPriceIdr"));
  const quantity = Math.max(1, Math.floor(Number(quantityRaw) || 1));
  if (!description || unitPriceIdr === null) return;

  const item = await addInvoiceLineItem({
    invoiceId,
    description,
    quantity,
    unitPriceIdr,
  });
  await logAdminAction({
    action: "invoice_line_item.add",
    targetType: "invoice",
    targetId: invoiceId,
    metadata: { itemId: item.id, totalIdr: item.totalIdr },
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function removeInvoiceLineItemAction(
  invoiceId: string,
  lineItemId: string,
) {
  await requireAdmin();
  await removeInvoiceLineItem(lineItemId);
  await logAdminAction({
    action: "invoice_line_item.remove",
    targetType: "invoice",
    targetId: invoiceId,
    metadata: { itemId: lineItemId },
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}
