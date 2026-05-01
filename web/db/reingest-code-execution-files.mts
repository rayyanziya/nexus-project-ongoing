import postgres from "postgres";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { readFile as fsReadFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_URL = "postgres://nexus:dev@localhost:5433/nexus_dev";
const url = process.env.DATABASE_URL ?? DEFAULT_URL;
const FILES_API_BETA = "files-api-2025-04-14" as const;

const STORAGE_ROOT = path.resolve(process.cwd(), ".uploads");

const CODE_EXECUTABLE_MIMES = new Set<string>([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);
const CODE_EXECUTABLE_EXTENSIONS = new Set<string>([".xlsx", ".xls", ".csv"]);
const EXTENSION_TO_MIME: Record<string, string> = {
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
};

function fileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function isCodeExecutable(mimeType: string, filename: string): boolean {
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  if (CODE_EXECUTABLE_MIMES.has(mime)) return true;
  return CODE_EXECUTABLE_EXTENSIONS.has(fileExtension(filename));
}

function normalizeMime(mimeType: string, filename: string): string {
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  if (CODE_EXECUTABLE_MIMES.has(mime)) return mimeType;
  return EXTENSION_TO_MIME[fileExtension(filename)] ?? mimeType;
}

type FileRow = {
  id: string;
  filename: string;
  mime_type: string;
  r2_key: string;
};

const sql = postgres(url, { max: 1, onnotice: () => {} });
const anthropic = new Anthropic();

const candidates = await sql<FileRow[]>`
  SELECT id, filename, mime_type, r2_key
  FROM project_files
  WHERE deleted_at IS NULL AND anthropic_file_id IS NULL
`;

const targets = candidates.filter((f) =>
  isCodeExecutable(f.mime_type, f.filename),
);
console.log(
  `found ${targets.length} code-executable files missing anthropicFileId (out of ${candidates.length} ingestion-untracked files)`,
);

let ok = 0;
let failed = 0;
for (const f of targets) {
  const uploadMime = normalizeMime(f.mime_type, f.filename);
  try {
    const buffer = await fsReadFile(path.resolve(STORAGE_ROOT, f.r2_key));
    const sdkFile = await toFile(buffer, f.filename, { type: uploadMime });
    const result = await anthropic.beta.files.upload({
      file: sdkFile,
      betas: [FILES_API_BETA],
    });
    await sql`
      UPDATE project_files
      SET anthropic_file_id = ${result.id}, updated_at = NOW()
      WHERE id = ${f.id}
    `;
    console.log(`✓ ${f.filename} → ${result.id}`);
    ok++;
  } catch (err) {
    console.error(
      `✗ ${f.filename}: ${err instanceof Error ? err.message : String(err)}`,
    );
    failed++;
  }
}

console.log(`done: ${ok} ingested, ${failed} failed`);
await sql.end();
