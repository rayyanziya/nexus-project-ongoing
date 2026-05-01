export const DOCUMENT_TYPES = {
  PROP: "Proposal",
  RAB: "Rencana Anggaran Biaya",
  INV: "Invoice",
  QUO: "Quotation",
  AGR: "Agreement",
  NDA: "Non-Disclosure Agreement",
  REP: "Report",
  MOM: "Minutes of Meeting",
  LTR: "Letter",
  SPK: "Surat Perintah Kerja",
  SOP: "Standard Operating Procedure",
  ADM: "Administrative",
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

export const INTERNAL_PROJECT_CODE = "INT";

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const;

const PROJECT_CODE_PATTERN = /^[A-Z]{3}$/;

export class DocumentNumberingError extends Error {}

export function isDocumentType(value: string): value is DocumentType {
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, value);
}

export function isValidProjectCode(value: string): boolean {
  return PROJECT_CODE_PATTERN.test(value);
}

export function romanMonth(month1to12: number): string {
  const idx = month1to12 - 1;
  if (idx < 0 || idx > 11) {
    throw new DocumentNumberingError(`Invalid month: ${month1to12}`);
  }
  return ROMAN_MONTHS[idx];
}

export function suggestProjectCode(name: string): string {
  const upper = name.toUpperCase();
  const letters = upper.replace(/[^A-Z]/g, "");
  if (letters.length === 0) return "";
  const consonants = letters.replace(/[AEIOU]/g, "");
  const candidate = consonants.length >= 3 ? consonants : letters;
  return candidate.slice(0, 3).padEnd(3, candidate[candidate.length - 1] ?? "X");
}

export function formatDocumentNumber(input: {
  docType: DocumentType;
  projectCode: string;
  issuedAt: Date;
  sequence: number;
}): string {
  const year = input.issuedAt.getFullYear();
  const month = romanMonth(input.issuedAt.getMonth() + 1);
  const seq = String(input.sequence).padStart(3, "0");
  return `GDI/${input.docType}/${input.projectCode}/${month}/${year}/${seq}`;
}
