import { NextResponse } from "next/server";
import { isAdmin, requireAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { deleteFromAnthropic } from "@/lib/anthropic-files";
import {
  getPostById,
  getPostFile,
  softDeletePostFile,
} from "@/lib/queries/feed";

type Params = { id: string; postId: string; fileId: string };

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<Params> },
) {
  await requireAuth();
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId, postId, fileId } = await ctx.params;
  const post = await getPostById(postId);
  if (!post || post.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await getPostFile({ postId, fileId });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await softDeletePostFile(fileId);

  if (file.anthropicFileId) {
    await deleteFromAnthropic(file.anthropicFileId);
  }

  await logAdminAction({
    action: "project_post.file.delete",
    targetType: "project_file",
    targetId: fileId,
    metadata: { projectId, postId, filename: file.filename },
  });

  return new Response(null, { status: 204 });
}
