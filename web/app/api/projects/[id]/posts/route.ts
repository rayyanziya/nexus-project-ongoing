import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth";
import { getClientUserByClerkId } from "@/lib/queries/client-users";
import {
  getProjectById,
  getProjectForClientUser,
} from "@/lib/queries/projects";
import { listPostsForProject } from "@/lib/queries/feed";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const cursorParam = url.searchParams.get("cursor");
  const limitParam = url.searchParams.get("limit");
  const cursor = cursorParam ? new Date(cursorParam) : null;
  const limit = limitParam ? Math.min(Number(limitParam) || 20, 100) : 20;

  if (await isAdmin()) {
    const project = await getProjectById(projectId);
    if (!project) return new Response("Not found", { status: 404 });
    const posts = await listPostsForProject({
      projectId,
      viewerKind: "admin",
      cursor,
      limit,
    });
    return Response.json({ posts });
  }

  const clientUser = await getClientUserByClerkId(userId);
  if (!clientUser) return new Response("Forbidden", { status: 403 });
  const project = await getProjectForClientUser({
    projectId,
    clientUserId: clientUser.id,
  });
  if (!project) return new Response("Not found", { status: 404 });

  const posts = await listPostsForProject({
    projectId,
    viewerKind: "client",
    cursor,
    limit,
  });
  return Response.json({ posts });
}
