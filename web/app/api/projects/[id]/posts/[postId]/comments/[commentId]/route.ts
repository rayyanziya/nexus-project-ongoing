import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { getClientUserByClerkId } from "@/lib/queries/client-users";
import {
  getCommentById,
  getPostById,
  softDeleteComment,
  updateComment,
} from "@/lib/queries/feed";

type Params = { id: string; postId: string; commentId: string };

async function loadAndAuthorize(
  params: Params,
  userId: string,
): Promise<
  | { ok: false; status: number; message: string }
  | {
      ok: true;
      comment: NonNullable<Awaited<ReturnType<typeof getCommentById>>>;
      isAdminCaller: boolean;
      isAuthor: boolean;
    }
> {
  const { id: projectId, postId, commentId } = params;
  const post = await getPostById(postId);
  if (!post || post.projectId !== projectId) {
    return { ok: false, status: 404, message: "Not found" };
  }
  const comment = await getCommentById(commentId);
  if (!comment || comment.postId !== postId) {
    return { ok: false, status: 404, message: "Not found" };
  }

  const isAdminCaller = await isAdmin();
  let isAuthor = false;
  if (comment.authorType === "admin") {
    isAuthor = comment.authorAdminId === userId;
  } else {
    const clientUser = await getClientUserByClerkId(userId);
    isAuthor = !!clientUser && comment.authorClientUserId === clientUser.id;
  }

  return { ok: true, comment, isAdminCaller, isAuthor };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<Params> },
) {
  const params = await ctx.params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const result = await loadAndAuthorize(params, userId);
  if (!result.ok) {
    return new Response(result.message, { status: result.status });
  }

  if (!result.isAuthor) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload = (await req.json()) as { body?: string };
  const body =
    typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length === 0) {
    return Response.json({ error: "Body is required" }, { status: 400 });
  }

  const updated = await updateComment({
    commentId: params.commentId,
    body,
  });
  if (!updated) return new Response("Not found", { status: 404 });

  if (result.isAdminCaller) {
    await logAdminAction({
      action: "post_comment.update",
      targetType: "post_comment",
      targetId: params.commentId,
      metadata: { projectId: params.id, postId: params.postId },
    });
  }

  return Response.json({ comment: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<Params> },
) {
  const params = await ctx.params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const result = await loadAndAuthorize(params, userId);
  if (!result.ok) {
    return new Response(result.message, { status: result.status });
  }

  if (!result.isAuthor && !result.isAdminCaller) {
    return new Response("Forbidden", { status: 403 });
  }

  await softDeleteComment(params.commentId);

  if (result.isAdminCaller) {
    await logAdminAction({
      action: "post_comment.delete",
      targetType: "post_comment",
      targetId: params.commentId,
      metadata: {
        projectId: params.id,
        postId: params.postId,
        adminOverride: !result.isAuthor,
      },
    });
  }

  return new Response(null, { status: 204 });
}
