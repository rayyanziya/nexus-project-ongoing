import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, projects } from "@/db/schema";
import {
  DOCUMENT_TYPES,
  INTERNAL_PROJECT_CODE,
  isDocumentType,
  nextDocumentNumber,
  type DocumentType,
} from "@/lib/document-numbering";

export type Document = typeof documents.$inferSelect;

export type DocumentWithProject = Document & {
  projectName: string | null;
  projectCode: string | null;
};

const documentWithProjectColumns = {
  id: documents.id,
  docType: documents.docType,
  projectId: documents.projectId,
  documentNumber: documents.documentNumber,
  title: documents.title,
  issuedAt: documents.issuedAt,
  r2Key: documents.r2Key,
  filename: documents.filename,
  mimeType: documents.mimeType,
  fileSize: documents.fileSize,
  createdByAdminId: documents.createdByAdminId,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
  projectName: projects.name,
  projectCode: projects.code,
};

export class DocumentError extends Error {}

export async function listDocuments(filters?: {
  docType?: DocumentType;
  projectId?: string | null;
  issuedOnly?: boolean;
  draftOnly?: boolean;
}): Promise<DocumentWithProject[]> {
  const where = [];
  if (filters?.docType) where.push(eq(documents.docType, filters.docType));
  if (filters?.issuedOnly) where.push(isNotNull(documents.documentNumber));
  if (filters?.draftOnly) where.push(isNull(documents.documentNumber));
  if (filters?.projectId === null) where.push(isNull(documents.projectId));
  else if (filters?.projectId)
    where.push(eq(documents.projectId, filters.projectId));

  const query = db
    .select(documentWithProjectColumns)
    .from(documents)
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .orderBy(desc(documents.createdAt));

  return where.length > 0 ? query.where(and(...where)) : query;
}

export async function getDocumentById(
  id: string,
): Promise<DocumentWithProject | null> {
  const [row] = await db
    .select(documentWithProjectColumns)
    .from(documents)
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .where(eq(documents.id, id))
    .limit(1);
  return row ?? null;
}

export async function createDocument(input: {
  docType: DocumentType;
  projectId: string | null;
  title: string;
  createdByAdminId: string;
}): Promise<Document> {
  if (!isDocumentType(input.docType)) {
    throw new DocumentError(`Unknown document type: ${input.docType}`);
  }
  const [row] = await db
    .insert(documents)
    .values({
      docType: input.docType,
      projectId: input.projectId,
      title: input.title,
      createdByAdminId: input.createdByAdminId,
    })
    .returning();
  return row;
}

export async function updateDocument(
  id: string,
  patch: {
    title?: string;
    projectId?: string | null;
  },
): Promise<Document | null> {
  const [row] = await db
    .update(documents)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();
  return row ?? null;
}

export async function setDocumentFile(
  id: string,
  file: {
    r2Key: string;
    filename: string;
    mimeType: string;
    fileSize: number;
  },
): Promise<Document | null> {
  const [row] = await db
    .update(documents)
    .set({ ...file, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();
  return row ?? null;
}

export async function clearDocumentFile(
  id: string,
): Promise<Document | null> {
  const [row] = await db
    .update(documents)
    .set({
      r2Key: null,
      filename: null,
      mimeType: null,
      fileSize: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id))
    .returning();
  return row ?? null;
}

export async function issueDocument(
  id: string,
): Promise<{ ok: true; document: Document } | { ok: false; reason: string }> {
  const [current] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!current) return { ok: false, reason: "Document not found." };
  if (current.documentNumber) {
    return {
      ok: false,
      reason: "Document is already issued.",
    };
  }
  if (!isDocumentType(current.docType)) {
    return { ok: false, reason: `Invalid document type: ${current.docType}` };
  }

  let projectCode = INTERNAL_PROJECT_CODE;
  if (current.projectId) {
    const [proj] = await db
      .select({ code: projects.code })
      .from(projects)
      .where(eq(projects.id, current.projectId))
      .limit(1);
    if (!proj) {
      return {
        ok: false,
        reason: "Linked project not found. Detach it or pick a different project.",
      };
    }
    projectCode = proj.code;
  }

  const issuedAt = new Date();
  const documentNumber = await nextDocumentNumber({
    docType: current.docType,
    projectCode,
    issuedAt,
  });

  const [row] = await db
    .update(documents)
    .set({
      documentNumber,
      issuedAt,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id))
    .returning();
  return { ok: true, document: row };
}

export async function hardDeleteDocument(id: string): Promise<Document | null> {
  const [row] = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning();
  return row ?? null;
}

export const SELECTABLE_DOCUMENT_TYPES: ReadonlyArray<{
  value: DocumentType;
  label: string;
}> = (Object.entries(DOCUMENT_TYPES) as Array<[DocumentType, string]>)
  .filter(([code]) => code !== "INV")
  .map(([value, label]) => ({ value, label }));
