"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import {
  clearDocumentFile,
  createDocument,
  getDocumentById,
  hardDeleteDocument,
  issueDocument,
  setDocumentFile,
  updateDocument,
} from "@/lib/queries/documents";
import { isDocumentType } from "@/lib/document-numbering";
import {
  buildDocumentFileKey,
  deleteFile,
  putFile,
} from "@/lib/storage";

const MAX_FILE_BYTES = 500 * 1024 * 1024;

function nullableTrim(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length === 0 ? null : s;
}

export async function createDocumentAction(formData: FormData): Promise<void> {
  const { clerkUserId } = await requireAdmin();
  const docType = String(formData.get("docType") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!isDocumentType(docType)) {
    throw new Error(`Pick a valid document type. Got: ${docType}`);
  }
  if (!title) throw new Error("Title is required.");

  const projectIdRaw = nullableTrim(formData.get("projectId"));
  const projectId = projectIdRaw === "INTERNAL" ? null : projectIdRaw;

  const doc = await createDocument({
    docType,
    projectId,
    title,
    createdByAdminId: clerkUserId,
  });

  const fileEntry = formData.get("file");
  if (fileEntry instanceof File && fileEntry.size > 0) {
    if (fileEntry.size > MAX_FILE_BYTES) {
      throw new Error(`File "${fileEntry.name}" exceeds 500MB limit.`);
    }
    const r2Key = buildDocumentFileKey({
      documentId: doc.id,
      filename: fileEntry.name,
    });
    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    await putFile(r2Key, buffer);
    await setDocumentFile(doc.id, {
      r2Key,
      filename: fileEntry.name,
      mimeType: fileEntry.type || "application/octet-stream",
      fileSize: fileEntry.size,
    });
  }

  await logAdminAction({
    action: "document.create",
    targetType: "document",
    targetId: doc.id,
    metadata: { docType, projectId, title },
  });
  revalidatePath("/admin/documents");
  redirect(`/admin/documents/${doc.id}`);
}

export async function updateDocumentAction(
  documentId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const patch: Parameters<typeof updateDocument>[1] = {};

  const title = formData.get("title");
  if (title !== null) {
    const t = String(title).trim();
    if (t.length > 0) patch.title = t;
  }

  const projectId = formData.get("projectId");
  if (projectId !== null) {
    const raw = nullableTrim(projectId);
    patch.projectId = raw === "INTERNAL" ? null : raw;
  }

  const updated = await updateDocument(documentId, patch);
  if (!updated) return;

  await logAdminAction({
    action: "document.update",
    targetType: "document",
    targetId: documentId,
    metadata: { patch },
  });
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${documentId}`);
}

export async function uploadDocumentFileAction(
  documentId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await requireAdmin();
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { ok: false, reason: "Pick a file to upload." };
  }
  if (fileEntry.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "File exceeds 500MB limit." };
  }

  const current = await getDocumentById(documentId);
  if (!current) return { ok: false, reason: "Document not found." };

  const r2Key = buildDocumentFileKey({
    documentId,
    filename: fileEntry.name,
  });
  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  await putFile(r2Key, buffer);

  if (current.r2Key) {
    await deleteFile(current.r2Key).catch(() => undefined);
  }

  await setDocumentFile(documentId, {
    r2Key,
    filename: fileEntry.name,
    mimeType: fileEntry.type || "application/octet-stream",
    fileSize: fileEntry.size,
  });

  await logAdminAction({
    action: "document.file.upload",
    targetType: "document",
    targetId: documentId,
    metadata: { filename: fileEntry.name, fileSize: fileEntry.size },
  });
  revalidatePath(`/admin/documents/${documentId}`);
  revalidatePath("/admin/documents");
  return { ok: true };
}

export async function clearDocumentFileAction(
  documentId: string,
): Promise<void> {
  await requireAdmin();
  const current = await getDocumentById(documentId);
  if (!current) return;
  if (current.r2Key) {
    await deleteFile(current.r2Key).catch(() => undefined);
  }
  await clearDocumentFile(documentId);
  await logAdminAction({
    action: "document.file.clear",
    targetType: "document",
    targetId: documentId,
  });
  revalidatePath(`/admin/documents/${documentId}`);
  revalidatePath("/admin/documents");
}

export async function issueDocumentAction(
  documentId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await requireAdmin();
  const result = await issueDocument(documentId);
  if (!result.ok) return result;

  await logAdminAction({
    action: "document.issue",
    targetType: "document",
    targetId: documentId,
    metadata: { documentNumber: result.document.documentNumber },
  });
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${documentId}`);
  return { ok: true };
}

export async function deleteDocumentAction(
  documentId: string,
): Promise<void> {
  await requireAdmin();
  const deleted = await hardDeleteDocument(documentId);
  if (deleted?.r2Key) {
    await deleteFile(deleted.r2Key).catch(() => undefined);
  }
  await logAdminAction({
    action: "document.delete",
    targetType: "document",
    targetId: documentId,
    metadata: {
      documentNumber: deleted?.documentNumber ?? null,
      title: deleted?.title ?? null,
    },
  });
  revalidatePath("/admin/documents");
}
