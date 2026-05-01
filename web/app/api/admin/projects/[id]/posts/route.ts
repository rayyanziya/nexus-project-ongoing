import { NextResponse } from "next/server";
import { isAdmin, requireAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { buildProjectFileKey, putFile } from "@/lib/storage";
import { getProjectById } from "@/lib/queries/projects";
import { createPost } from "@/lib/queries/feed";
import { setProjectFileAnthropicId } from "@/lib/queries/knowledge";
import {
  isCodeExecutable,
  normalizeMimeForCodeExec,
  uploadToAnthropic,
} from "@/lib/anthropic-files";

const MAX_FILE_BYTES = 500 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { clerkUserId } = await requireAuth();
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await ctx.params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const form = await req.formData();
  const bodyRaw = form.get("body");
  const body =
    typeof bodyRaw === "string" && bodyRaw.trim().length > 0
      ? bodyRaw.trim()
      : null;
  const forAiContext = form.get("forAiContext") === "on";
  const clientVisible = form.get("clientVisible") !== "off";

  const fileEntries = form.getAll("files").filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  for (const file of fileEntries) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds 500MB limit` },
        { status: 413 },
      );
    }
  }

  if (body === null && fileEntries.length === 0) {
    return NextResponse.json(
      { error: "Post must have a body or at least one file" },
      { status: 400 },
    );
  }

  const uploadedFiles: Array<{
    filename: string;
    mimeType: string;
    r2Key: string;
    fileSize: number;
  }> = [];
  for (const file of fileEntries) {
    const r2Key = buildProjectFileKey({ projectId, filename: file.name });
    const buffer = Buffer.from(await file.arrayBuffer());
    await putFile(r2Key, buffer);
    uploadedFiles.push({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      r2Key,
      fileSize: file.size,
    });
  }

  const created = await createPost({
    projectId,
    authorAdminId: clerkUserId,
    body,
    forAiContext,
    clientVisible,
    files: uploadedFiles,
  });

  for (const file of created.files) {
    if (!isCodeExecutable({ mimeType: file.mimeType, filename: file.filename })) {
      continue;
    }
    const uploadMime = normalizeMimeForCodeExec({
      mimeType: file.mimeType,
      filename: file.filename,
    });
    try {
      const anthropicFileId = await uploadToAnthropic({
        localKey: file.r2Key,
        mimeType: uploadMime,
        filename: file.filename,
      });
      await setProjectFileAnthropicId(file.id, anthropicFileId);
      file.anthropicFileId = anthropicFileId;
      console.log("[posts] anthropic ingestion ok", {
        fileId: file.id,
        filename: file.filename,
        anthropicFileId,
      });
    } catch (err) {
      console.error("[posts] anthropic ingestion failed", {
        fileId: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        err,
      });
    }
  }

  await logAdminAction({
    action: "project_post.create",
    targetType: "project_post",
    targetId: created.id,
    metadata: {
      projectId,
      hasBody: body !== null,
      fileCount: uploadedFiles.length,
      forAiContext,
      clientVisible,
    },
  });

  return NextResponse.json({ post: created }, { status: 201 });
}
