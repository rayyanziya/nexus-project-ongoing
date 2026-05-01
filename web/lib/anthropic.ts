import Anthropic from "@anthropic-ai/sdk";
import { formatBytes } from "@/lib/format";
import { readFileBuffer } from "@/lib/storage";
import type {
  AiContextPost,
  PostComment,
  ProjectFile,
} from "@/lib/queries/feed";
import type { ProjectWithClient } from "@/lib/queries/projects";

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 4096;
const FILES_API_BETA = "files-api-2025-04-14";

export const CHAT_REQUEST_HEADERS = {
  "anthropic-beta": FILES_API_BETA,
} as const;

let cachedClient: Anthropic | null = null;
export function getAnthropicClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export type ProjectAssistantContext = {
  project: ProjectWithClient;
  posts: AiContextPost[];
  conversation: { id: string; containerId: string | null };
};

function allFiles(ctx: ProjectAssistantContext): ProjectFile[] {
  return ctx.posts.flatMap((p) => p.files);
}

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
};

type ImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
const IMAGE_MIMES = new Set<ImageMime>([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const PDF_MIME = "application/pdf";

const CODE_EXECUTION_TOOL: Anthropic.Messages.ToolUnion = {
  type: "code_execution_20260120",
  name: "code_execution",
};

const SYSTEM_GROUND_RULES = `You are the per-project assistant for a GDI (PT Global Dataverse Indonesia) client engagement. You help the client understand the state of their project — its current status, deliverables, what's in the documents and notes shared with them, and what to do next.

GROUND RULES
- The "Project facts" section at the top of your context is ground truth. When the client asks about status or progress, cite ONLY the structured "Status" field and the dates listed there. Do NOT extrapolate progress from contract milestones, expected delivery dates, or document contents — those are plans, not status.
- If the knowledge base has no progress notes and the client asks about progress beyond the structured status, say so plainly and direct them to message their GDI account manager.
- The "Project posts" section is the project narrative — chronological updates from GDI, each one optionally with attached files and comments. Comments under a post are listed beneath it with [GDI] or [Client] labels; replies are indented one level. The "Files in your knowledge base" section flattens every attached file into a single inventory. Each file entry has a marker indicating whether you can read its contents. Some files are readable: text-extracted documents appear inline below; images and PDFs are attached natively; spreadsheets/CSVs are loaded into your code execution sandbox and can be analyzed with Python (pandas, matplotlib). Others are listed as "filename only — contents not yet readable" because their file type (such as video) is not yet ingested. NEVER claim a "filename only" file is missing from the knowledge base; acknowledge it by name. If asked about its contents, explain that you cannot read that file type yet and suggest the client ask their GDI account manager.
- For files marked "analyzable via the code execution tool" (xlsx/xls/csv): use the code_execution tool to answer questions. Write Python with pandas — read the file from the container, compute the answer, cite specific values, sheets, and rows. When the client asks for a chart, generate it with matplotlib and save the figure to a file (e.g. \`fig.savefig("chart.png")\`); the saved chart will surface inline in the chat for the client.
- Only answer from the project context provided. If the answer is not in the context, say so.
- Never speculate about pricing, timelines, or commitments not stated in the context.
- Match the client's language (Bahasa Indonesia or English).
- Be concise. Cite filenames or post dates when you reference them.`;

function formatDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

function renderProjectFacts(p: ProjectWithClient): string {
  const lines = [
    `Name: ${p.name}`,
    `Code: ${p.code}`,
    `Client: ${p.clientName}`,
    `Status: ${p.status}`,
    `Started: ${formatDate(p.startedAt)}`,
    `Expected delivery: ${formatDate(p.expectedDeliveryAt)}`,
    `Delivered: ${formatDate(p.deliveredAt)}`,
  ];
  if (p.description) lines.push("", "Description:", p.description);
  return lines.join("\n");
}

function renderComments(comments: PostComment[]): string {
  if (comments.length === 0) return "";
  const top = comments.filter((c) => c.parentCommentId === null);
  const repliesByParent = new Map<string, PostComment[]>();
  for (const c of comments) {
    if (c.parentCommentId) {
      const arr = repliesByParent.get(c.parentCommentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentCommentId, arr);
    }
  }
  const lines: string[] = ["", "Comments:"];
  for (const t of top) {
    const label = t.authorType === "admin" ? "GDI" : "Client";
    lines.push(`- [${label}] ${t.body.replace(/\n+/g, " ")}`);
    for (const r of repliesByParent.get(t.id) ?? []) {
      const rLabel = r.authorType === "admin" ? "GDI" : "Client";
      lines.push(`  - [${rLabel}] ${r.body.replace(/\n+/g, " ")}`);
    }
  }
  return lines.join("\n");
}

function renderPosts(posts: AiContextPost[]): string {
  if (posts.length === 0) return "(no posts in knowledge base)";
  return posts
    .map((p) => {
      const heading = `### ${formatDate(p.createdAt)}`;
      const body = p.body?.trim() || "(no body — file-only post)";
      const attached =
        p.files.length > 0
          ? `\n\nAttached: ${p.files.map((f) => f.filename).join(", ")}`
          : "";
      return `${heading}\n\n${body}${attached}${renderComments(p.comments)}`;
    })
    .join("\n\n---\n\n");
}

function isMultimodalFile(f: ProjectFile): boolean {
  const m = f.mimeType.toLowerCase();
  return IMAGE_MIMES.has(m as ImageMime) || m === PDF_MIME;
}

function fileAvailability(f: ProjectFile): string {
  const mime = f.mimeType.toLowerCase();
  if (IMAGE_MIMES.has(mime as ImageMime)) {
    return "image attached to this conversation";
  }
  if (mime === PDF_MIME) {
    return "PDF attached to this conversation";
  }
  if (f.anthropicFileId) {
    return "analyzable via the code execution tool";
  }
  if (f.extractedText) return "text contents below";
  return "filename only — contents not yet readable";
}

function renderFileInventory(files: ProjectFile[]): string {
  if (files.length === 0) return "(no files in knowledge base)";
  return files
    .map(
      (f) =>
        `- ${f.filename} (${f.mimeType}, ${formatBytes(f.fileSize)}) — ${fileAvailability(f)}`,
    )
    .join("\n");
}

function renderTextFiles(files: ProjectFile[]): string {
  const textFiles = files.filter(
    (f) => f.extractedText && !isMultimodalFile(f) && !f.anthropicFileId,
  );
  if (textFiles.length === 0) {
    return "(no text-extracted documents — see file inventory above for what's available)";
  }
  return textFiles
    .map((f) => `### ${f.filename}\n\n${f.extractedText}`)
    .join("\n\n---\n\n");
}

export function buildSystem(
  ctx: ProjectAssistantContext,
): Anthropic.Messages.TextBlockParam[] {
  const files = allFiles(ctx);
  const contextBody = [
    "## Project facts (ground truth)",
    "",
    renderProjectFacts(ctx.project),
    "",
    "## Files in your knowledge base",
    "",
    renderFileInventory(files),
    "",
    "## Project posts (narrative)",
    "",
    renderPosts(ctx.posts),
    "",
    "## Text-extracted document contents",
    "",
    renderTextFiles(files),
  ].join("\n");

  return [
    { type: "text", text: SYSTEM_GROUND_RULES },
    {
      type: "text",
      text: contextBody,
      cache_control: { type: "ephemeral" },
    },
  ];
}

export async function buildMultimodalPreamble(
  ctx: ProjectAssistantContext,
): Promise<Anthropic.Messages.ContentBlockParam[] | null> {
  const blocks: Anthropic.Messages.ContentBlockParam[] = [];
  const files = allFiles(ctx);

  for (const f of files) {
    const mime = f.mimeType.toLowerCase();
    if (IMAGE_MIMES.has(mime as ImageMime)) {
      const buf = await readFileBuffer(f.r2Key);
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mime as ImageMime,
          data: buf.toString("base64"),
        },
      });
    } else if (mime === PDF_MIME) {
      const buf = await readFileBuffer(f.r2Key);
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buf.toString("base64"),
        },
        title: f.filename,
      });
    }
  }

  for (const f of files) {
    if (f.anthropicFileId) {
      blocks.push({
        type: "container_upload",
        file_id: f.anthropicFileId,
      });
    }
  }

  if (blocks.length === 0) return null;

  blocks.push({
    type: "text",
    text: "(The above are reference files shared with you on this project. Images and PDFs are attached natively; spreadsheets/CSVs are loaded into your code execution sandbox. Cite by filename.)",
    cache_control: { type: "ephemeral" },
  });
  return blocks;
}

async function assembleMessages(input: {
  ctx: ProjectAssistantContext;
  history: ChatTurn[];
  userMessage: string;
}): Promise<Anthropic.Messages.MessageParam[]> {
  const preamble = await buildMultimodalPreamble(input.ctx);
  const messages: Anthropic.Messages.MessageParam[] = [];

  if (input.history.length === 0) {
    const content: Anthropic.Messages.ContentBlockParam[] = [
      ...(preamble ?? []),
      { type: "text", text: input.userMessage },
    ];
    messages.push({ role: "user", content });
    return messages;
  }

  for (let i = 0; i < input.history.length; i++) {
    const turn = input.history[i];
    if (i === 0 && turn.role === "user" && preamble) {
      messages.push({
        role: "user",
        content: [...preamble, { type: "text", text: turn.text }],
      });
    } else {
      messages.push({ role: turn.role, content: turn.text });
    }
  }
  messages.push({ role: "user", content: input.userMessage });
  return messages;
}

function hasCodeExecutableFiles(files: ProjectFile[]): boolean {
  return files.some((f) => Boolean(f.anthropicFileId));
}

export type ChatRequestParams = {
  model: string;
  max_tokens: number;
  system: Anthropic.Messages.TextBlockParam[];
  messages: Anthropic.Messages.MessageParam[];
  thinking: { type: "disabled" };
  tools?: Anthropic.Messages.ToolUnion[];
  container?: string;
};

export async function buildChatRequestParams(input: {
  ctx: ProjectAssistantContext;
  history: ChatTurn[];
  userMessage: string;
}): Promise<ChatRequestParams> {
  const system = buildSystem(input.ctx);
  const messages = await assembleMessages(input);
  const params: ChatRequestParams = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system,
    messages,
    thinking: { type: "disabled" },
  };
  if (hasCodeExecutableFiles(allFiles(input.ctx))) {
    params.tools = [CODE_EXECUTION_TOOL];
  }
  if (input.ctx.conversation.containerId) {
    params.container = input.ctx.conversation.containerId;
  }
  return params;
}

export function streamChatRequest(params: ChatRequestParams) {
  const client = getAnthropicClient();
  return client.messages.stream(params, { headers: CHAT_REQUEST_HEADERS });
}
