import { requireClient } from "@/lib/auth";
import { getProjectForClientUser } from "@/lib/queries/projects";
import {
  deleteConversation,
  getOrCreateConversation,
  listMessages,
  messagesToWire,
} from "@/lib/queries/chat";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { clientUser } = await requireClient();

  const project = await getProjectForClientUser({
    projectId: id,
    clientUserId: clientUser.id,
  });
  if (!project) return new Response("Not found", { status: 404 });

  const conversation = await getOrCreateConversation({
    projectId: id,
    clientUserId: clientUser.id,
  });
  const stored = await listMessages(conversation.id);

  return Response.json({
    conversationId: conversation.id,
    messages: messagesToWire(stored),
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { clientUser } = await requireClient();

  const project = await getProjectForClientUser({
    projectId: id,
    clientUserId: clientUser.id,
  });
  if (!project) return new Response("Not found", { status: 404 });

  await deleteConversation({
    projectId: id,
    clientUserId: clientUser.id,
  });
  return new Response(null, { status: 204 });
}
