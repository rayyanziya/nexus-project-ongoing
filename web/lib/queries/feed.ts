import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  postComments,
  projectFiles,
  projectMembers,
  projectPosts,
} from "@/db/schema";

export type ProjectPost = typeof projectPosts.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type ProjectFile = typeof projectFiles.$inferSelect;

export type PostWithFiles = ProjectPost & { files: ProjectFile[] };
export type AiContextPost = PostWithFiles & { comments: PostComment[] };

export type ViewerKind = "admin" | "client";

const DEFAULT_PAGE_SIZE = 20;

async function attachFilesToPosts(
  posts: ProjectPost[],
): Promise<PostWithFiles[]> {
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  const files = await db
    .select()
    .from(projectFiles)
    .where(and(inArray(projectFiles.postId, ids), isNull(projectFiles.deletedAt)));
  const byPost = new Map<string, ProjectFile[]>();
  for (const f of files) {
    if (!f.postId) continue;
    const arr = byPost.get(f.postId) ?? [];
    arr.push(f);
    byPost.set(f.postId, arr);
  }
  return posts.map((p) => ({ ...p, files: byPost.get(p.id) ?? [] }));
}

export async function listForAiContextPosts(
  projectId: string,
): Promise<AiContextPost[]> {
  const posts = await db
    .select()
    .from(projectPosts)
    .where(
      and(
        eq(projectPosts.projectId, projectId),
        eq(projectPosts.forAiContext, true),
        isNull(projectPosts.deletedAt),
      ),
    )
    .orderBy(asc(projectPosts.createdAt));
  const withFiles = await attachFilesToPosts(posts);
  if (withFiles.length === 0) return [];

  const ids = withFiles.map((p) => p.id);
  const allComments = await db
    .select()
    .from(postComments)
    .where(
      and(inArray(postComments.postId, ids), isNull(postComments.deletedAt)),
    )
    .orderBy(asc(postComments.createdAt));
  const byPost = new Map<string, PostComment[]>();
  for (const c of allComments) {
    const arr = byPost.get(c.postId) ?? [];
    arr.push(c);
    byPost.set(c.postId, arr);
  }
  return withFiles.map((p) => ({
    ...p,
    comments: byPost.get(p.id) ?? [],
  }));
}

export async function listPostsForProject(input: {
  projectId: string;
  viewerKind: ViewerKind;
  cursor?: Date | null;
  limit?: number;
}): Promise<PostWithFiles[]> {
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const filters = [
    eq(projectPosts.projectId, input.projectId),
    isNull(projectPosts.deletedAt),
  ];
  if (input.viewerKind === "client") {
    filters.push(eq(projectPosts.clientVisible, true));
  }
  if (input.cursor) {
    filters.push(lt(projectPosts.createdAt, input.cursor));
  }
  const posts = await db
    .select()
    .from(projectPosts)
    .where(and(...filters))
    .orderBy(desc(projectPosts.createdAt))
    .limit(limit);
  return attachFilesToPosts(posts);
}

export async function getPostById(
  postId: string,
): Promise<PostWithFiles | null> {
  const [post] = await db
    .select()
    .from(projectPosts)
    .where(
      and(eq(projectPosts.id, postId), isNull(projectPosts.deletedAt)),
    )
    .limit(1);
  if (!post) return null;
  const [withFiles] = await attachFilesToPosts([post]);
  return withFiles;
}

export async function getPostByIdForClientUser(input: {
  postId: string;
  clientUserId: string;
}): Promise<PostWithFiles | null> {
  const [row] = await db
    .select({ post: projectPosts })
    .from(projectPosts)
    .innerJoin(
      projectMembers,
      eq(projectMembers.projectId, projectPosts.projectId),
    )
    .where(
      and(
        eq(projectPosts.id, input.postId),
        eq(projectPosts.clientVisible, true),
        eq(projectMembers.clientUserId, input.clientUserId),
        isNull(projectPosts.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  const [withFiles] = await attachFilesToPosts([row.post]);
  return withFiles;
}

export async function createPost(input: {
  projectId: string;
  authorAdminId: string;
  body: string | null;
  forAiContext: boolean;
  clientVisible: boolean;
  files: Array<{
    filename: string;
    mimeType: string;
    r2Key: string;
    fileSize: number;
    extractedText?: string | null;
  }>;
}): Promise<PostWithFiles> {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(projectPosts)
      .values({
        projectId: input.projectId,
        authorAdminId: input.authorAdminId,
        body: input.body,
        forAiContext: input.forAiContext,
        clientVisible: input.clientVisible,
      })
      .returning();

    if (input.files.length === 0) {
      return { ...post, files: [] };
    }

    const fileRows = await tx
      .insert(projectFiles)
      .values(
        input.files.map((f) => ({
          projectId: input.projectId,
          postId: post.id,
          filename: f.filename,
          mimeType: f.mimeType,
          r2Key: f.r2Key,
          fileSize: f.fileSize,
          extractedText: f.extractedText ?? null,
          uploadedByAdminId: input.authorAdminId,
        })),
      )
      .returning();

    return { ...post, files: fileRows };
  });
}

export async function updatePost(input: {
  postId: string;
  patch: {
    body?: string | null;
    forAiContext?: boolean;
    clientVisible?: boolean;
  };
}): Promise<ProjectPost | null> {
  const [row] = await db
    .update(projectPosts)
    .set({ ...input.patch, updatedAt: new Date() })
    .where(
      and(eq(projectPosts.id, input.postId), isNull(projectPosts.deletedAt)),
    )
    .returning();
  return row ?? null;
}

export async function softDeletePost(postId: string): Promise<void> {
  const now = new Date();
  await db
    .update(projectPosts)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(projectPosts.id, postId));
}

export async function getPostFile(input: {
  postId: string;
  fileId: string;
}): Promise<ProjectFile | null> {
  const [row] = await db
    .select()
    .from(projectFiles)
    .where(
      and(
        eq(projectFiles.id, input.fileId),
        eq(projectFiles.postId, input.postId),
        isNull(projectFiles.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function softDeletePostFile(fileId: string): Promise<void> {
  const now = new Date();
  await db
    .update(projectFiles)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(projectFiles.id, fileId));
}

export async function listCommentsForPost(
  postId: string,
): Promise<PostComment[]> {
  return db
    .select()
    .from(postComments)
    .where(
      and(eq(postComments.postId, postId), isNull(postComments.deletedAt)),
    )
    .orderBy(asc(postComments.createdAt));
}

export async function getCommentById(
  commentId: string,
): Promise<PostComment | null> {
  const [row] = await db
    .select()
    .from(postComments)
    .where(
      and(eq(postComments.id, commentId), isNull(postComments.deletedAt)),
    )
    .limit(1);
  return row ?? null;
}

export async function createComment(input: {
  postId: string;
  parentCommentId: string | null;
  authorType: "admin" | "client";
  authorAdminId: string | null;
  authorClientUserId: string | null;
  body: string;
}): Promise<PostComment> {
  const [row] = await db
    .insert(postComments)
    .values({
      postId: input.postId,
      parentCommentId: input.parentCommentId,
      authorType: input.authorType,
      authorAdminId: input.authorAdminId,
      authorClientUserId: input.authorClientUserId,
      body: input.body,
    })
    .returning();
  return row;
}

export async function updateComment(input: {
  commentId: string;
  body: string;
}): Promise<PostComment | null> {
  const [row] = await db
    .update(postComments)
    .set({ body: input.body, updatedAt: new Date() })
    .where(
      and(eq(postComments.id, input.commentId), isNull(postComments.deletedAt)),
    )
    .returning();
  return row ?? null;
}

export async function softDeleteComment(commentId: string): Promise<void> {
  const now = new Date();
  await db
    .update(postComments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(postComments.id, commentId));
}
