import { isAdmin, requireAuth } from "@/lib/auth";
import { getDocumentById } from "@/lib/queries/documents";
import { isInlineSafeMime, readFile } from "@/lib/storage";

function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : size - 1;
  if (start > end || start < 0 || end >= size) return null;
  return { start, end };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAuth();
  if (!(await isAdmin())) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;
  const doc = await getDocumentById(id);
  if (!doc || !doc.r2Key || !doc.filename || !doc.mimeType || doc.fileSize === null) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";
  const disposition =
    forceDownload || !isInlineSafeMime(doc.mimeType) ? "attachment" : "inline";

  const baseHeaders: Record<string, string> = {
    "Content-Type": doc.mimeType,
    "Content-Disposition": `${disposition}; filename="${encodeURIComponent(doc.filename)}"`,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };

  const fullSize = doc.fileSize;
  const range = parseRange(req.headers.get("range"), fullSize);

  if (range) {
    const { body } = await readFile(doc.r2Key, range);
    return new Response(body, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${fullSize}`,
      },
    });
  }

  const { body, size } = await readFile(doc.r2Key);
  return new Response(body, {
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}
