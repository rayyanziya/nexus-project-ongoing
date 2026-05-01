import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ensureClientUserProvisioned,
  getClientUserByClerkId,
  type ClientUser,
} from "@/lib/queries/client-users";

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin";
      client_id?: string;
    };
  }
}

export async function requireAuth(): Promise<{ clerkUserId: string }> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();
  return { clerkUserId: userId! };
}

export async function isAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata?.role === "admin";
}

export async function requireAdmin(): Promise<{ clerkUserId: string }> {
  const { clerkUserId } = await requireAuth();
  if (!(await isAdmin())) redirect("/dashboard");
  return { clerkUserId };
}

export async function requireClient(): Promise<{
  clerkUserId: string;
  clientUser: ClientUser;
}> {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();
  const clerkUserId = userId!;

  if (sessionClaims?.metadata?.role === "admin") redirect("/admin");

  let clientUser = await getClientUserByClerkId(clerkUserId);
  if (!clientUser && sessionClaims?.metadata?.client_id) {
    clientUser = await ensureClientUserProvisioned({
      clerkUserId,
      clientId: sessionClaims.metadata.client_id,
    });
  }
  if (!clientUser) redirect("/not-provisioned");
  return { clerkUserId, clientUser };
}

export async function getCurrentClientUser(): Promise<ClientUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getClientUserByClerkId(userId);
}
