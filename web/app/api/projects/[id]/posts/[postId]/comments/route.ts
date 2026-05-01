import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import {
  getClientUserByClerkId,
  listClientUsersByIds,
} from "@/lib/queries/client-users";
import {
  getProjectById,
  getProjectForClientUser,
} from "@/lib/queries/projects";
import {
  createComment,
  getCommentById,
  getPostById,
  listCommentsForPost,
  type PostComment,
} from "@/lib/queries/feed";

const ADMIN_DISPLAY_NAME = "GDI";

async function enrichComments(rows: PostComment[]) {
  const clientUserIds = Array.from(
    new Set(
      rows
        .filter((r) => r.authorType === "client" && r.authorClientUserId)
        .map((r) => r.authorClientUserId as string),
    ),
  );
  const users = await listClientUsersByIds(clientUserIds);
  const nameById = new Map(
    users.map((u) => [u.id, u.fullName?.trim() || u.email] as const),
  );
  return rows.map((r) => ({
    ...r,
    authorDisplayName:
      r.authorType === "admin"
        ? ADMIN_DISPLAY_NAME
        : (r.authorClientUserId && nameById.get(r.authorClientUserId)) ||
          "Client",
  }));
}

type Params = { id: string; postId: string };

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> },
) {
  const { id: projectId, postId } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const post = await getPostById(postId);
  if (!post || post.projectId !== projectId) {
    return new Response("Not found", { status: 404 });
  }

  if (await isAdmin()) {
    const project = await getProjectById(projectId);
    if (!project) return new Response("Not found", { status: 404 });
  } else {
    const clientUser = await getClientUserByClerkId(userId);
    if (!clientUser) return new Response("Forbidden", { status: 403 });
    const project = await getProjectForClientUser({
      projectId,
      clientUserId: clientUser.id,
    });
    if (!project) return new Response("Not found", { status: 404 });
    if (!post.clientVisible) {
      return new Response("Not found", { status: 404 });
    }
  }

  const rows = await listCommentsForPost(postId);
  const comments = await enrichComments(rows);
  return Response.json({ comments });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<Params> },
) {
  const { id: projectId, postId } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const post = await getPostById(postId);
  if (!post || post.projectId !== projectId) {
    return new Response("Not found", { status: 404 });
  }

  const payload = (await req.json()) as {
    body?: string;
    parentCommentId?: string | null;
  };
  const body =
    typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length === 0) {
    return Response.json({ error: "Body is required" }, { status: 400 });
  }
  const parentCommentId = payload.parentCommentId ?? null;
  if (parentCommentId) {
    const parent = await getCommentById(parentCommentId);
    if (!parent || parent.postId !== postId) {
      return Response.json(
        { error: "Parent comment not found" },
        { status: 404 },
      );
    }
    if (parent.parentCommentId !== null) {
      return Response.json(
        { error: "Replies cannot be nested deeper than one level" },
        { status: 400 },
      );
    }
  }

  const adminCheck = await isAdmin();
  if (adminCheck) {
    const project = await getProjectById(projectId);
    if (!project) return new Response("Not found", { status: 404 });
    const created = await createComment({
      postId,
      parentCommentId,
      authorType: "admin",
      authorAdminId: userId,
      authorClientUserId: null,
      body,
    });
    await logAdminAction({
      action: "post_comment.create",
      targetType: "post_comment",
      targetId: created.id,
      metadata: { projectId, postId, parentCommentId },
    });
    return Response.json(
      {
        comment: { ...created, authorDisplayName: ADMIN_DISPLAY_NAME },
      },
      { status: 201 },
    );
  }

  const clientUser = await getClientUserByClerkId(userId);
  if (!clientUser) return new Response("Forbidden", { status: 403 });
  const project = await getProjectForClientUser({
    projectId,
    clientUserId: clientUser.id,
  });
  if (!project) return new Response("Not found", { status: 404 });
  if (!post.clientVisible) {
    return new Response("Not found", { status: 404 });
  }

  const created = await createComment({
    postId,
    parentCommentId,
    authorType: "client",
    authorAdminId: null,
    authorClientUserId: clientUser.id,
    body,
  });
  const authorDisplayName =
    clientUser.fullName?.trim() || clientUser.email;
  return Response.json(
    { comment: { ...created, authorDisplayName } },
    { status: 201 },
  );
}
