import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";

type AdminActionInput = {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminAction(input: AdminActionInput): Promise<void> {
  const { userId } = await auth();
  await db.insert(auditLog).values({
    actorType: "admin",
    actorId: userId,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
}
