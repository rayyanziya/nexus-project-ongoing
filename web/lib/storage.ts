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
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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

export function buildDocumentFileKey(input: {
  documentId: string;
  filename: string;
}): StorageKey {
  const safeName = input.filename.replace(/[^\w.\- ]+/g, "_").trim() || "file";
  return `documents/${input.documentId}/${randomUUID()}-${safeName}`;
}

const r2Bucket = process.env.R2_BUCKET;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const useR2 = Boolean(
  r2Bucket && r2AccountId && r2AccessKeyId && r2SecretAccessKey,
);

let r2Client: S3Client | null = null;
function r2(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId!,
        secretAccessKey: r2SecretAccessKey!,
      },
    });
  }
  return r2Client;
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
  if (useR2) {
    await r2().send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: body,
      }),
    );
    return;
  }
  const abs = resolveAbsolute(key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export async function deleteFile(key: StorageKey): Promise<void> {
  if (useR2) {
    await r2().send(
      new DeleteObjectCommand({
        Bucket: r2Bucket,
        Key: key,
      }),
    );
    return;
  }
  const abs = resolveAbsolute(key);
  await unlink(abs).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

export async function readFile(
  key: StorageKey,
  range?: { start: number; end?: number },
): Promise<{ body: ReadableStream<Uint8Array>; size: number }> {
  if (useR2) {
    const rangeHeader = range
      ? `bytes=${range.start}-${range.end ?? ""}`
      : undefined;
    const response = await r2().send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Range: rangeHeader,
      }),
    );
    if (!response.Body) {
      throw new Error(`Empty response for key ${key}`);
    }
    const bodyStream =
      response.Body.transformToWebStream() as ReadableStream<Uint8Array>;
    let size = response.ContentLength ?? 0;
    if (range && response.ContentRange) {
      const totalMatch = response.ContentRange.match(/\/(\d+)$/);
      if (totalMatch) size = parseInt(totalMatch[1], 10);
    }
    return { body: bodyStream, size };
  }
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
  if (useR2) {
    const response = await r2().send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: key,
      }),
    );
    if (!response.Body) throw new Error(`Empty response for key ${key}`);
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
  return fsReadFile(resolveAbsolute(key));
}
