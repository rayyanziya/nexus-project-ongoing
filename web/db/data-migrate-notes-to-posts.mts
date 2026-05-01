import { drizzle } from "drizzle-orm/postgres-js";
import { isNull } from "drizzle-orm";
import postgres from "postgres";
import { projectNotes, projectPosts } from "./schema/index.ts";

const DEFAULT_URL = "postgres://nexus:dev@localhost:5433/nexus_dev";
const url = process.env.DATABASE_URL ?? DEFAULT_URL;

const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql);

const notes = await db
  .select()
  .from(projectNotes)
  .where(isNull(projectNotes.deletedAt));
console.log(`found ${notes.length} active notes`);

const existingPosts = await db
  .select({
    projectId: projectPosts.projectId,
    createdAt: projectPosts.createdAt,
  })
  .from(projectPosts);
const existingKeys = new Set(
  existingPosts.map((p) => `${p.projectId}:${p.createdAt.toISOString()}`),
);

let migrated = 0;
let skipped = 0;
for (const n of notes) {
  const key = `${n.projectId}:${n.createdAt.toISOString()}`;
  if (existingKeys.has(key)) {
    skipped++;
    continue;
  }
  const body = n.title ? `# ${n.title}\n\n${n.content}` : n.content;
  await db.insert(projectPosts).values({
    projectId: n.projectId,
    authorAdminId: n.createdByAdminId,
    body,
    forAiContext: n.forAiContext,
    clientVisible: n.clientVisible,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  });
  migrated++;
  existingKeys.add(key);
}

console.log(`migrated ${migrated}, skipped ${skipped} (already migrated)`);
await sql.end();
