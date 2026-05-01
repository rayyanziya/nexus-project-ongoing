import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientUsers, projectMembers } from "@/db/schema";
import type { ClientUser } from "./client-users";

export type ProjectMember = ClientUser & { addedAt: Date };

const memberColumns = {
  id: clientUsers.id,
  clientId: clientUsers.clientId,
  clerkUserId: clientUsers.clerkUserId,
  email: clientUsers.email,
  fullName: clientUsers.fullName,
  role: clientUsers.role,
  status: clientUsers.status,
  lastSeenAt: clientUsers.lastSeenAt,
  createdAt: clientUsers.createdAt,
  updatedAt: clientUsers.updatedAt,
  deletedAt: clientUsers.deletedAt,
  addedAt: projectMembers.addedAt,
};

export async function listProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  return db
    .select(memberColumns)
    .from(projectMembers)
    .innerJoin(clientUsers, eq(projectMembers.clientUserId, clientUsers.id))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        isNull(clientUsers.deletedAt),
      ),
    )
    .orderBy(desc(projectMembers.addedAt));
}

export async function listAvailableMembersForProject(input: {
  projectId: string;
  clientId: string;
}): Promise<ClientUser[]> {
  const existing = await db
    .select({ id: projectMembers.clientUserId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, input.projectId));
  const existingIds = existing.map((r) => r.id);

  const baseWhere = and(
    eq(clientUsers.clientId, input.clientId),
    isNull(clientUsers.deletedAt),
  );

  return db
    .select()
    .from(clientUsers)
    .where(
      existingIds.length === 0
        ? baseWhere
        : and(baseWhere, notInArray(clientUsers.id, existingIds)),
    )
    .orderBy(desc(clientUsers.createdAt));
}

export async function addProjectMember(input: {
  projectId: string;
  clientUserId: string;
}): Promise<void> {
  await db
    .insert(projectMembers)
    .values({
      projectId: input.projectId,
      clientUserId: input.clientUserId,
    })
    .onConflictDoNothing();
}

export async function removeProjectMember(input: {
  projectId: string;
  clientUserId: string;
}): Promise<void> {
  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, input.projectId),
        eq(projectMembers.clientUserId, input.clientUserId),
      ),
    );
}
