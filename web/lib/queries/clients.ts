import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients } from "@/db/schema";

export type Client = typeof clients.$inferSelect;

export async function listClients(): Promise<Client[]> {
  return db
    .select()
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(desc(clients.createdAt));
}

export async function getClientById(id: string): Promise<Client | null> {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1);
  return row ?? null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function createClient(input: {
  name: string;
  notes?: string | null;
}): Promise<Client> {
  const [row] = await db
    .insert(clients)
    .values({
      name: input.name,
      slug: slugify(input.name),
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateClientName(
  id: string,
  name: string,
): Promise<Client | null> {
  const [row] = await db
    .update(clients)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteClient(id: string): Promise<void> {
  await db
    .update(clients)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(eq(clients.id, id));
}
