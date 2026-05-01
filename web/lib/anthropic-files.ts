import { toFile } from "@anthropic-ai/sdk";
import { getAnthropicClient } from "@/lib/anthropic";
import { readFileBuffer } from "@/lib/storage";

const FILES_API_BETA = "files-api-2025-04-14" as const;

const CODE_EXECUTABLE_MIMES = new Set<string>([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

const CODE_EXECUTABLE_EXTENSIONS = new Set<string>([
  ".xlsx",
  ".xls",
  ".csv",
]);

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

export function isCodeExecutableMime(mime: string): boolean {
  return CODE_EXECUTABLE_MIMES.has(mime.toLowerCase().split(";")[0].trim());
}

export function isCodeExecutable(input: {
  mimeType: string;
  filename: string;
}): boolean {
  if (isCodeExecutableMime(input.mimeType)) return true;
  return CODE_EXECUTABLE_EXTENSIONS.has(fileExtension(input.filename));
}

export function normalizeMimeForCodeExec(input: {
  mimeType: string;
  filename: string;
}): string {
  if (isCodeExecutableMime(input.mimeType)) return input.mimeType;
  const fromExt = EXTENSION_TO_MIME[fileExtension(input.filename)];
  return fromExt ?? input.mimeType;
}

export async function uploadToAnthropic(input: {
  localKey: string;
  mimeType: string;
  filename: string;
}): Promise<string> {
  const buffer = await readFileBuffer(input.localKey);
  const file = await toFile(buffer, input.filename, { type: input.mimeType });
  const client = getAnthropicClient();
  const result = await client.beta.files.upload({
    file,
    betas: [FILES_API_BETA],
  });
  return result.id;
}

export async function deleteFromAnthropic(fileId: string): Promise<void> {
  const client = getAnthropicClient();
  try {
    await client.beta.files.delete(fileId, { betas: [FILES_API_BETA] });
  } catch (err) {
    console.error("[anthropic-files] delete failed", { fileId, err });
  }
}

export async function downloadFromAnthropic(
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const client = getAnthropicClient();
  const response = await client.beta.files.download(fileId, {
    betas: [FILES_API_BETA],
  });
  const arrayBuffer = await response.arrayBuffer();
  const mimeType =
    response.headers.get("content-type") ?? "application/octet-stream";
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}
