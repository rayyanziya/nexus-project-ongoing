import type Anthropic from "@anthropic-ai/sdk";
import { requireClient } from "@/lib/auth";
import {
  ANTHROPIC_MODEL,
  buildChatRequestParams,
  streamChatRequest,
  type ChatRequestParams,
  type ProjectAssistantContext,
} from "@/lib/anthropic";
import { harvestCodeExecutionOutputs } from "@/lib/anthropic-outputs";
import {
  appendAssistantMessage,
  appendImageRefsToMessage,
  appendUserMessage,
  getOrCreateConversation,
  listMessages,
  messagesToTurns,
  setConversationContainerId,
} from "@/lib/queries/chat";
import { listForAiContextPosts } from "@/lib/queries/feed";
import { getProjectForClientUser } from "@/lib/queries/projects";

const MAX_USER_MESSAGE_CHARS = 8000;
const MAX_PAUSE_TURN_ITERATIONS = 5;

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { clientUser } = await requireClient();

  const project = await getProjectForClientUser({
    projectId: id,
    clientUserId: clientUser.id,
  });
  if (!project) return new Response("Not found", { status: 404 });

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const rawText =
    parsed && typeof parsed === "object" && "text" in parsed
      ? (parsed as { text: unknown }).text
      : null;
  if (typeof rawText !== "string" || !rawText.trim()) {
    return new Response("text is required", { status: 400 });
  }
  if (rawText.length > MAX_USER_MESSAGE_CHARS) {
    return new Response("Message too long", { status: 413 });
  }
  const userMessage = rawText;

  const conversation = await getOrCreateConversation({
    projectId: id,
    clientUserId: clientUser.id,
  });

  const [posts, prior] = await Promise.all([
    listForAiContextPosts(id),
    listMessages(conversation.id),
  ]);

  await appendUserMessage({
    conversationId: conversation.id,
    text: userMessage,
  });

  const modelContext: ProjectAssistantContext = {
    project,
    posts,
    conversation: {
      id: conversation.id,
      containerId: conversation.containerId,
    },
  };
  const history = messagesToTurns(prior);

  const initialParams = await buildChatRequestParams({
    ctx: modelContext,
    history,
    userMessage,
  });

  const encoder = new TextEncoder();

  const responseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assembled = "";
      let tokensInTotal = 0;
      let tokensOutTotal = 0;
      let cacheReadTotal = 0;
      let cacheCreationTotal = 0;
      let containerIdToPersist: string | null = null;
      let lastFinalMessage: Anthropic.Messages.Message | null = null;
      let params: ChatRequestParams = initialParams;

      try {
        for (let i = 0; i < MAX_PAUSE_TURN_ITERATIONS; i++) {
          const stream = streamChatRequest(params);
          stream.on("text", (chunk) => {
            assembled += chunk;
            controller.enqueue(encoder.encode(sse("text", { text: chunk })));
          });
          const finalMessage = await stream.finalMessage();
          lastFinalMessage = finalMessage;

          const usage = finalMessage.usage;
          tokensInTotal += usage.input_tokens ?? 0;
          tokensOutTotal += usage.output_tokens ?? 0;
          cacheReadTotal += usage.cache_read_input_tokens ?? 0;
          cacheCreationTotal += usage.cache_creation_input_tokens ?? 0;

          if (
            finalMessage.container?.id &&
            !modelContext.conversation.containerId &&
            !containerIdToPersist
          ) {
            containerIdToPersist = finalMessage.container.id;
          }

          if (finalMessage.stop_reason !== "pause_turn") break;

          params = {
            ...params,
            messages: [
              ...params.messages,
              {
                role: "assistant",
                content:
                  finalMessage.content as unknown as Anthropic.Messages.ContentBlockParam[],
              },
            ],
            container:
              params.container ??
              modelContext.conversation.containerId ??
              containerIdToPersist ??
              undefined,
          };
        }

        const message = await appendAssistantMessage({
          conversationId: conversation.id,
          text: assembled,
          model: ANTHROPIC_MODEL,
          tokensIn: tokensInTotal,
          tokensOut: tokensOutTotal,
          cacheReadTokens: cacheReadTotal,
          cacheCreationTokens: cacheCreationTotal,
          cacheHit: cacheReadTotal > 0,
        });

        if (lastFinalMessage) {
          const harvested = await harvestCodeExecutionOutputs({
            finalMessage: lastFinalMessage,
            conversationId: conversation.id,
            messageId: message.id,
          });
          if (harvested.length > 0) {
            await appendImageRefsToMessage(
              message.id,
              harvested.map((h) => ({
                outputId: h.outputId,
                filename: h.filename,
              })),
            );
            for (const h of harvested) {
              controller.enqueue(
                encoder.encode(
                  sse("image", {
                    outputId: h.outputId,
                    filename: h.filename,
                    mimeType: h.mimeType,
                  }),
                ),
              );
            }
          }
        }

        if (containerIdToPersist) {
          await setConversationContainerId(
            conversation.id,
            containerIdToPersist,
          );
        }

        controller.enqueue(encoder.encode(sse("done", {})));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream error";
        try {
          controller.enqueue(encoder.encode(sse("error", { message })));
        } catch {
          // controller may already be closed
        }
        controller.close();
      }
    },
  });

  return new Response(responseBody, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
