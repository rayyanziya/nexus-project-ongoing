import { auth } from "@clerk/nextjs/server";
import { getClientUserByClerkId } from "@/lib/queries/client-users";
import { getConversationOutputForClientUser } from "@/lib/queries/chat";
import { isInlineSafeMime, readFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const clientUser = await getClientUserByClerkId(userId);
  if (!clientUser) return new Response("Not found", { status: 404 });

  const output = await getConversationOutputForClientUser({
    outputId: id,
    clientUserId: clientUser.id,
  });
  if (!output) return new Response("Not found", { status: 404 });

  const disposition = isInlineSafeMime(output.mimeType)
    ? "inline"
    : "attachment";
  const { body, size } = await readFile(output.r2Key);
  return new Response(body, {
    headers: {
      "Content-Type": output.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(output.filename)}"`,
      "Content-Length": String(size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60",
    },
  });
}
