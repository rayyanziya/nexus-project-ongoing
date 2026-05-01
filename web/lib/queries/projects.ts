import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, projectMembers, projects } from "@/db/schema";

export type Project = typeof projects.$inferSelect;
export type ProjectStatus = Project["status"];

export type ProjectWithClient = Project & {
  clientName: string;
  clientSlug: string;
};

const projectWithClientColumns = {
  id: projects.id,
  clientId: projects.clientId,
  code: projects.code,
  name: projects.name,
  description: projects.description,
  status: projects.status,
  startedAt: projects.startedAt,
  expectedDeliveryAt: projects.expectedDeliveryAt,
  deliveredAt: projects.deliveredAt,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
  deletedAt: projects.deletedAt,
  clientName: clients.name,
  clientSlug: clients.slug,
};

export async function listProjects(): Promise<ProjectWithClient[]> {
  return db
    .select(projectWithClientColumns)
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(
  id: string,
): Promise<ProjectWithClient | null> {
  const [row] = await db
    .select(projectWithClientColumns)
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function createProject(input: {
  clientId: string;
  code: string;
  name: string;
  description?: string | null;
}): Promise<Project> {
  const [row] = await db
    .insert(projects)
    .values({
      clientId: input.clientId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function isProjectCodeTaken(code: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.code, code))
    .limit(1);
  return Boolean(row);
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
    startedAt?: Date | null;
    expectedDeliveryAt?: Date | null;
    deliveredAt?: Date | null;
  },
): Promise<Project | null> {
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteProject(id: string): Promise<void> {
  await db
    .update(projects)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function listProjectsForClientUser(
  clientUserId: string,
): Promise<ProjectWithClient[]> {
  return db
    .select(projectWithClientColumns)
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
    .where(
      and(
        eq(projectMembers.clientUserId, clientUserId),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectForClientUser(input: {
  projectId: string;
  clientUserId: string;
}): Promise<ProjectWithClient | null> {
  const [row] = await db
    .select(projectWithClientColumns)
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projectMembers.clientUserId, input.clientUserId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
