import type Anthropic from "@anthropic-ai/sdk";
import { downloadFromAnthropic } from "@/lib/anthropic-files";
import { createConversationOutput } from "@/lib/queries/chat";
import { putFile } from "@/lib/storage";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export type HarvestedOutput = {
  outputId: string;
  filename: string;
  mimeType: string;
};

function extractAnthropicFileIds(message: Anthropic.Messages.Message): string[] {
  const fileIds: string[] = [];
  for (const block of message.content) {
    if (block.type !== "bash_code_execution_tool_result") continue;
    const result = block.content;
    if (result.type !== "bash_code_execution_result") continue;
    for (const out of result.content) {
      if (out.type === "bash_code_execution_output") {
        fileIds.push(out.file_id);
      }
    }
  }
  return fileIds;
}

export async function harvestCodeExecutionOutputs(input: {
  finalMessage: Anthropic.Messages.Message;
  conversationId: string;
  messageId: string;
}): Promise<HarvestedOutput[]> {
  const fileIds = extractAnthropicFileIds(input.finalMessage);
  if (fileIds.length === 0) return [];

  const harvested: HarvestedOutput[] = [];
  let index = 0;
  for (const fileId of fileIds) {
    index++;
    try {
      const { buffer, mimeType } = await downloadFromAnthropic(fileId);
      const baseMime = mimeType.split(";")[0].toLowerCase().trim();
      const ext = MIME_TO_EXT[baseMime] ?? "bin";
      const filename = `chart_${index}.${ext}`;
      const r2Key = `chart-outputs/${input.conversationId}/${fileId}.${ext}`;
      await putFile(r2Key, buffer);
      const row = await createConversationOutput({
        conversationId: input.conversationId,
        messageId: input.messageId,
        filename,
        mimeType: baseMime,
        r2Key,
        fileSize: buffer.length,
        anthropicFileId: fileId,
      });
      harvested.push({
        outputId: row.id,
        filename: row.filename,
        mimeType: row.mimeType,
      });
    } catch (err) {
      console.error("[harvestCodeExecutionOutputs] failed", { fileId, err });
    }
  }
  return harvested;
}
