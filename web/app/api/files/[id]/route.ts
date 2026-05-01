import { auth } from "@clerk/nextjs/server";
import {
  getProjectFile,
  getProjectFileForClientUser,
} from "@/lib/queries/knowledge";
import { getClientUserByClerkId } from "@/lib/queries/client-users";
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
  const { id } = await ctx.params;
  const { userId, sessionClaims } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const isAdmin = sessionClaims?.metadata?.role === "admin";

  const file = isAdmin
    ? await getProjectFile(id)
    : await (async () => {
        const clientUser = await getClientUserByClerkId(userId);
        if (!clientUser) return null;
        return getProjectFileForClientUser({
          fileId: id,
          clientUserId: clientUser.id,
        });
      })();

  if (!file) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";
  const disposition =
    forceDownload || !isInlineSafeMime(file.mimeType) ? "attachment" : "inline";

  const baseHeaders: Record<string, string> = {
    "Content-Type": file.mimeType,
    "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.filename)}"`,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };

  const fullSize = file.fileSize;
  const range = parseRange(req.headers.get("range"), fullSize);

  if (range) {
    const { body } = await readFile(file.r2Key, range);
    return new Response(body, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${fullSize}`,
      },
    });
  }

  const { body, size } = await readFile(file.r2Key);
  return new Response(body, {
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}
