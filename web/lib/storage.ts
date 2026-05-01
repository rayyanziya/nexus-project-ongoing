import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile as fsReadFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

const STORAGE_ROOT = path.resolve(process.cwd(), ".uploads");

export type StorageKey = string;

const INLINE_SAFE_MIMES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

export function isInlineSafeMime(mime: string): boolean {
  return INLINE_SAFE_MIMES.has(mime.toLowerCase().split(";")[0].trim());
}

export function buildProjectFileKey(input: {
  projectId: string;
  filename: string;
}): StorageKey {
  const safeName = input.filename.replace(/[^\w.\- ]+/g, "_").trim() || "file";
  return `projects/${input.projectId}/${randomUUID()}-${safeName}`;
}

function resolveAbsolute(key: StorageKey): string {
  const abs = path.resolve(STORAGE_ROOT, key);
  if (!abs.startsWith(STORAGE_ROOT + path.sep) && abs !== STORAGE_ROOT) {
    throw new Error("Invalid storage key");
  }
  return abs;
}

export async function putFile(
  key: StorageKey,
  body: Buffer | Uint8Array,
): Promise<void> {
  const abs = resolveAbsolute(key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export async function deleteFile(key: StorageKey): Promise<void> {
  const abs = resolveAbsolute(key);
  await unlink(abs).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

export async function readFile(
  key: StorageKey,
  range?: { start: number; end?: number },
): Promise<{ body: ReadableStream<Uint8Array>; size: number }> {
  const abs = resolveAbsolute(key);
  const info = await stat(abs);
  const opts = range
    ? { start: range.start, end: range.end ?? info.size - 1 }
    : undefined;
  const node = createReadStream(abs, opts);
  return {
    body: Readable.toWeb(node) as ReadableStream<Uint8Array>,
    size: info.size,
  };
}

export async function readFileBuffer(key: StorageKey): Promise<Buffer> {
  return fsReadFile(resolveAbsolute(key));
}
