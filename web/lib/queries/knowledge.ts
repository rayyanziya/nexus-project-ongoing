import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectFiles, projectMembers, projectPosts } from "@/db/schema";

export type ProjectFile = typeof projectFiles.$inferSelect;

export async function getProjectFile(id: string): Promise<ProjectFile | null> {
  const [row] = await db
    .select()
    .from(projectFiles)
    .where(and(eq(projectFiles.id, id), isNull(projectFiles.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getProjectFileForClientUser(input: {
  fileId: string;
  clientUserId: string;
}): Promise<ProjectFile | null> {
  const [row] = await db
    .select({ file: projectFiles })
    .from(projectFiles)
    .innerJoin(
      projectMembers,
      eq(projectMembers.projectId, projectFiles.projectId),
    )
    .leftJoin(projectPosts, eq(projectPosts.id, projectFiles.postId))
    .where(
      and(
        eq(projectFiles.id, input.fileId),
        eq(projectMembers.clientUserId, input.clientUserId),
        isNull(projectFiles.deletedAt),
        or(
          and(
            isNull(projectFiles.postId),
            eq(projectFiles.clientVisible, true),
          ),
          and(
            eq(projectPosts.clientVisible, true),
            isNull(projectPosts.deletedAt),
          ),
        ),
      ),
    )
    .limit(1);
  return row?.file ?? null;
}

export async function setProjectFileAnthropicId(
  id: string,
  anthropicFileId: string | null,
): Promise<void> {
  await db
    .update(projectFiles)
    .set({ anthropicFileId, updatedAt: new Date() })
    .where(eq(projectFiles.id, id));
}
