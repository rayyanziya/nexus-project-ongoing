import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import postgres from "postgres";
import { projectFiles, projectPosts } from "./schema/index.ts";

const DEFAULT_URL = "postgres://nexus:dev@localhost:5433/nexus_dev";
const url = process.env.DATABASE_URL ?? DEFAULT_URL;

const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql);

const orphans = await db
  .select()
  .from(projectFiles)
  .where(
    and(isNull(projectFiles.postId), isNull(projectFiles.deletedAt)),
  );

console.log(`found ${orphans.length} orphan files`);

let migrated = 0;
for (const f of orphans) {
  await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(projectPosts)
      .values({
        projectId: f.projectId,
        authorAdminId: f.uploadedByAdminId,
        body: null,
        forAiContext: f.forAiContext,
        clientVisible: false,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })
      .returning({ id: projectPosts.id });
    await tx
      .update(projectFiles)
      .set({ postId: post.id, updatedAt: new Date() })
      .where(eq(projectFiles.id, f.id));
  });
  migrated++;
}

console.log(`migrated ${migrated} orphan files into admin-only posts`);
await sql.end();
