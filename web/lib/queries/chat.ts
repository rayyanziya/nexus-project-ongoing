import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversationOutputs,
  projectConversations,
  projectMessages,
} from "@/db/schema";
import type { ChatTurn } from "@/lib/anthropic";

export type ProjectConversation = typeof projectConversations.$inferSelect;
export type ProjectMessage = typeof projectMessages.$inferSelect;
export type ConversationOutput = typeof conversationOutputs.$inferSelect;

export type StoredTextBlock = { type: "text"; text: string };
export type StoredImageRefBlock = {
  type: "image_ref";
  outputId: string;
  filename: string;
};
export type StoredContentBlock = StoredTextBlock | StoredImageRefBlock;
export type StoredContent = StoredContentBlock[];

export async function getOrCreateConversation(input: {
  projectId: string;
  clientUserId: string;
}): Promise<ProjectConversation> {
  await db
    .insert(projectConversations)
    .values(input)
    .onConflictDoNothing({
      target: [
        projectConversations.projectId,
        projectConversations.clientUserId,
      ],
    });

  const [row] = await db
    .select()
    .from(projectConversations)
    .where(
      and(
        eq(projectConversations.projectId, input.projectId),
        eq(projectConversations.clientUserId, input.clientUserId),
      ),
    )
    .limit(1);
  return row;
}

export async function listMessages(
  conversationId: string,
): Promise<ProjectMessage[]> {
  return db
    .select()
    .from(projectMessages)
    .where(eq(projectMessages.conversationId, conversationId))
    .orderBy(asc(projectMessages.createdAt));
}

async function bumpConversation(conversationId: string): Promise<void> {
  const now = new Date();
  await db
    .update(projectConversations)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(projectConversations.id, conversationId));
}

export async function setConversationContainerId(
  conversationId: string,
  containerId: string,
): Promise<void> {
  await db
    .update(projectConversations)
    .set({ containerId, updatedAt: new Date() })
    .where(eq(projectConversations.id, conversationId));
}

export async function appendUserMessage(input: {
  conversationId: string;
  text: string;
}): Promise<ProjectMessage> {
  const content: StoredContent = [{ type: "text", text: input.text }];
  const [row] = await db
    .insert(projectMessages)
    .values({
      conversationId: input.conversationId,
      role: "user",
      content,
    })
    .returning();
  await bumpConversation(input.conversationId);
  return row;
}

export async function appendAssistantMessage(input: {
  conversationId: string;
  text: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  cacheHit: boolean;
}): Promise<ProjectMessage> {
  const content: StoredContent = [{ type: "text", text: input.text }];
  const [row] = await db
    .insert(projectMessages)
    .values({
      conversationId: input.conversationId,
      role: "assistant",
      content,
      model: input.model,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      cacheReadTokens: input.cacheReadTokens,
      cacheCreationTokens: input.cacheCreationTokens,
      cacheHit: input.cacheHit,
    })
    .returning();
  await bumpConversation(input.conversationId);
  return row;
}

export async function appendImageRefsToMessage(
  messageId: string,
  refs: Array<{ outputId: string; filename: string }>,
): Promise<void> {
  if (refs.length === 0) return;
  const [existing] = await db
    .select()
    .from(projectMessages)
    .where(eq(projectMessages.id, messageId))
    .limit(1);
  if (!existing) return;
  const newBlocks: StoredImageRefBlock[] = refs.map((r) => ({
    type: "image_ref",
    outputId: r.outputId,
    filename: r.filename,
  }));
  const updatedContent: StoredContent = [
    ...(existing.content as StoredContent),
    ...newBlocks,
  ];
  await db
    .update(projectMessages)
    .set({ content: updatedContent })
    .where(eq(projectMessages.id, messageId));
}

export async function createConversationOutput(input: {
  conversationId: string;
  messageId: string;
  filename: string;
  mimeType: string;
  r2Key: string;
  fileSize: number;
  anthropicFileId: string | null;
}): Promise<ConversationOutput> {
  const [row] = await db
    .insert(conversationOutputs)
    .values(input)
    .returning();
  return row;
}

export async function getConversationOutputForClientUser(input: {
  outputId: string;
  clientUserId: string;
}): Promise<ConversationOutput | null> {
  const [row] = await db
    .select({ output: conversationOutputs })
    .from(conversationOutputs)
    .innerJoin(
      projectConversations,
      eq(projectConversations.id, conversationOutputs.conversationId),
    )
    .where(
      and(
        eq(conversationOutputs.id, input.outputId),
        eq(projectConversations.clientUserId, input.clientUserId),
      ),
    )
    .limit(1);
  return row?.output ?? null;
}

export async function deleteConversation(input: {
  projectId: string;
  clientUserId: string;
}): Promise<void> {
  await db
    .delete(projectConversations)
    .where(
      and(
        eq(projectConversations.projectId, input.projectId),
        eq(projectConversations.clientUserId, input.clientUserId),
      ),
    );
}

export function messagesToTurns(messages: ProjectMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const blocks = m.content as StoredContent;
    const text = blocks
      .filter((b): b is StoredTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    turns.push({ role: m.role, text });
  }
  return turns;
}

export type WireMessagePart =
  | { kind: "text"; value: string }
  | { kind: "image"; outputId: string; filename: string };

export type WireMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: WireMessagePart[];
  createdAt: Date;
};

export function messagesToWire(messages: ProjectMessage[]): WireMessage[] {
  return messages.map((m) => {
    const blocks = (m.content as StoredContent) ?? [];
    const parts: WireMessagePart[] = blocks.map((b) =>
      b.type === "text"
        ? { kind: "text", value: b.text }
        : { kind: "image", outputId: b.outputId, filename: b.filename },
    );
    return {
      id: m.id,
      role: m.role,
      parts,
      createdAt: m.createdAt,
    };
  });
}
