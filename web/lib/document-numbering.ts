import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentSequences } from "@/db/schema";
import {
  DocumentNumberingError,
  INTERNAL_PROJECT_CODE,
  formatDocumentNumber,
  isDocumentType,
  isValidProjectCode,
  type DocumentType,
} from "./document-numbering-format";

export {
  DOCUMENT_TYPES,
  DocumentNumberingError,
  INTERNAL_PROJECT_CODE,
  formatDocumentNumber,
  isDocumentType,
  isValidProjectCode,
  romanMonth,
  suggestProjectCode,
  type DocumentType,
} from "./document-numbering-format";

async function nextSequence(input: {
  year: number;
  docType: DocumentType;
  projectCode: string;
}): Promise<number> {
  const [row] = await db
    .insert(documentSequences)
    .values({
      year: input.year,
      docType: input.docType,
      projectCode: input.projectCode,
      lastValue: 1,
    })
    .onConflictDoUpdate({
      target: [
        documentSequences.year,
        documentSequences.docType,
        documentSequences.projectCode,
      ],
      set: { lastValue: sql`${documentSequences.lastValue} + 1` },
    })
    .returning({ lastValue: documentSequences.lastValue });
  return row.lastValue;
}

export async function nextDocumentNumber(input: {
  docType: DocumentType;
  projectCode: string;
  issuedAt?: Date;
}): Promise<string> {
  if (!isDocumentType(input.docType)) {
    throw new DocumentNumberingError(`Unknown document type: ${input.docType}`);
  }
  if (
    input.projectCode !== INTERNAL_PROJECT_CODE &&
    !isValidProjectCode(input.projectCode)
  ) {
    throw new DocumentNumberingError(
      `Project code must be 3 uppercase letters or "${INTERNAL_PROJECT_CODE}"`,
    );
  }
  const issuedAt = input.issuedAt ?? new Date();
  const sequence = await nextSequence({
    year: issuedAt.getFullYear(),
    docType: input.docType,
    projectCode: input.projectCode,
  });
  return formatDocumentNumber({
    docType: input.docType,
    projectCode: input.projectCode,
    issuedAt,
    sequence,
  });
}
