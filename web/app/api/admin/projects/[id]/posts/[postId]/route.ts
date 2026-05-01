import { NextResponse } from "next/server";
import { isAdmin, requireAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import {
  getPostById,
  softDeletePost,
  updatePost,
} from "@/lib/queries/feed";

type Params = { id: string; postId: string };

export async function PATCH(
  req: Request,
  ctx: { params: Promise<Params> },
) {
  await requireAuth();
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId, postId } = await ctx.params;
  const post = await getPostById(postId);
  if (!post || post.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = (await req.json()) as {
    body?: string | null;
    forAiContext?: boolean;
    clientVisible?: boolean;
  };

  const patch: {
    body?: string | null;
    forAiContext?: boolean;
    clientVisible?: boolean;
  } = {};
  if ("body" in payload) {
    const trimmed =
      typeof payload.body === "string" ? payload.body.trim() : null;
    patch.body = trimmed && trimmed.length > 0 ? trimmed : null;
  }
  if (typeof payload.forAiContext === "boolean") {
    patch.forAiContext = payload.forAiContext;
  }
  if (typeof payload.clientVisible === "boolean") {
    patch.clientVisible = payload.clientVisible;
  }

  if (patch.body === null && post.files.length === 0) {
    return NextResponse.json(
      { error: "Post must keep a body or at least one file" },
      { status: 400 },
    );
  }

  const updated = await updatePost({ postId, patch });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAdminAction({
    action: "project_post.update",
    targetType: "project_post",
    targetId: postId,
    metadata: { projectId, patch },
  });

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<Params> },
) {
  await requireAuth();
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId, postId } = await ctx.params;
  const post = await getPostById(postId);
  if (!post || post.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await softDeletePost(postId);

  await logAdminAction({
    action: "project_post.delete",
    targetType: "project_post",
    targetId: postId,
    metadata: { projectId },
  });

  return new Response(null, { status: 204 });
}
