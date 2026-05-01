import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clientUsers } from "@/db/schema";

export type ClientUser = typeof clientUsers.$inferSelect;
export type NewClientUser = typeof clientUsers.$inferInsert;

export async function getClientUserByClerkId(
  clerkUserId: string,
): Promise<ClientUser | null> {
  const [row] = await db
    .select()
    .from(clientUsers)
    .where(eq(clientUsers.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export async function listClientUsersByIds(
  ids: string[],
): Promise<ClientUser[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(clientUsers)
    .where(inArray(clientUsers.id, ids));
}

export async function listClientUsersByClientId(
  clientId: string,
): Promise<ClientUser[]> {
  return db
    .select()
    .from(clientUsers)
    .where(
      and(eq(clientUsers.clientId, clientId), isNull(clientUsers.deletedAt)),
    )
    .orderBy(desc(clientUsers.createdAt));
}

type UpsertInput = {
  clerkUserId: string;
  clientId: string;
  email: string;
  fullName?: string | null;
};

export async function upsertClientUserFromClerk(
  input: UpsertInput,
): Promise<ClientUser> {
  const [row] = await db
    .insert(clientUsers)
    .values({
      clerkUserId: input.clerkUserId,
      clientId: input.clientId,
      email: input.email,
      fullName: input.fullName ?? null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: clientUsers.clerkUserId,
      set: {
        email: input.email,
        fullName: input.fullName ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function softDeleteClientUserByClerkId(
  clerkUserId: string,
): Promise<void> {
  await db
    .update(clientUsers)
    .set({ status: "archived", deletedAt: new Date() })
    .where(eq(clientUsers.clerkUserId, clerkUserId));
}

export async function ensureClientUserProvisioned(input: {
  clerkUserId: string;
  clientId: string;
}): Promise<ClientUser | null> {
  const existing = await getClientUserByClerkId(input.clerkUserId);
  if (existing) return existing;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(input.clerkUserId);
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) return null;
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
    return await upsertClientUserFromClerk({
      clerkUserId: input.clerkUserId,
      clientId: input.clientId,
      email,
      fullName,
    });
  } catch {
    return null;
  }
}
