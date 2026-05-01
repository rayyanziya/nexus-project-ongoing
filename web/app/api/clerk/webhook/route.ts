import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import {
  upsertClientUserFromClerk,
  softDeleteClientUserByClerkId,
} from "@/lib/queries/client-users";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name, public_metadata } =
        evt.data;
      if (public_metadata?.role === "admin") break;
      const clientId = public_metadata?.client_id;
      if (typeof clientId !== "string") break;
      const email =
        email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)
          ?.email_address ?? email_addresses?.[0]?.email_address;
      if (!email) break;
      const fullName =
        [first_name, last_name].filter(Boolean).join(" ") || null;
      await upsertClientUserFromClerk({
        clerkUserId: id,
        clientId,
        email,
        fullName,
      });
      break;
    }
    case "user.deleted": {
      if (evt.data.id) await softDeleteClientUserByClerkId(evt.data.id);
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
