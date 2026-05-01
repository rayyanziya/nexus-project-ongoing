"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/app/_components/markdown";

type MessagePart =
  | { kind: "text"; value: string }
  | { kind: "image"; outputId: string; filename: string };

type WireMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  createdAt: string;
};

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
};

type SseEvent = { event: string; data: string };

function parseSseBlock(block: string): SseEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

function appendTextToParts(parts: MessagePart[], chunk: string): MessagePart[] {
  if (parts.length > 0 && parts[parts.length - 1].kind === "text") {
    const last = parts[parts.length - 1] as { kind: "text"; value: string };
    return [...parts.slice(0, -1), { kind: "text", value: last.value + chunk }];
  }
  return [...parts, { kind: "text", value: chunk }];
}

export function ProjectChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/chat`);
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = (await res.json()) as { messages: WireMessage[] };
        if (cancelled) return;
        setMessages(
          data.messages
            .filter(
              (m): m is WireMessage & { role: "user" | "assistant" } =>
                m.role === "user" || m.role === "assistant",
            )
            .map((m) => ({ id: m.id, role: m.role, parts: m.parts })),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft("");
    setStreaming(true);
    setError(null);

    const userId = `local-${Date.now()}-u`;
    const assistantId = `local-${Date.now()}-a`;
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", parts: [{ kind: "text", value: text }] },
      { id: assistantId, role: "assistant", parts: [] },
    ]);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Send failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const ev = parseSseBlock(block);
          if (!ev) continue;
          if (ev.event === "text") {
            const payload = JSON.parse(ev.data) as { text: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, parts: appendTextToParts(m.parts, payload.text) }
                  : m,
              ),
            );
          } else if (ev.event === "image") {
            const payload = JSON.parse(ev.data) as {
              outputId: string;
              filename: string;
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      parts: [
                        ...m.parts,
                        {
                          kind: "image",
                          outputId: payload.outputId,
                          filename: payload.filename,
                        },
                      ],
                    }
                  : m,
              ),
            );
          } else if (ev.event === "error") {
            const payload = JSON.parse(ev.data) as { message: string };
            throw new Error(payload.message);
          } else if (ev.event === "done") {
            // no-op; loop will exit when stream closes
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.parts.length === 0
            ? {
                ...m,
                parts: [
                  { kind: "text", value: "(no response — please try again)" },
                ],
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  async function clearChat() {
    if (loading || streaming || messages.length === 0) return;
    if (
      !window.confirm(
        "Clear this conversation? All previous messages will be permanently deleted.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Clear failed (${res.status})`);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    }
  }

  return (
    <section className="mt-10 flex h-[28rem] flex-col rounded-lg border border-border bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Project assistant
          </h2>
          <p className="mt-0.5 text-xs text-subtle">
            Ask about your project. Answers reference shared files and notes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void clearChat()}
          disabled={loading || streaming || messages.length === 0}
          className="shrink-0 cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear chat
        </button>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-sm text-subtle">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-subtle">
            Start the conversation — try asking about your project&apos;s
            current status.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-md bg-brand-soft px-3 py-2 text-sm text-foreground"
                    : "mr-8 rounded-md border border-border-strong px-3 py-2 text-sm text-foreground"
                }
              >
                <div className="text-xs font-medium uppercase tracking-wide text-subtle">
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="mt-1 break-words text-sm">
                  <MessageBody role={m.role} parts={m.parts} streaming={streaming} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-border px-4 py-3"
      >
        {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading || streaming}
            rows={2}
            placeholder="Ask about your project…"
            className="flex-1 resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || streaming || !draft.trim()}
            className="self-end rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MessageBody({
  role,
  parts,
  streaming,
}: {
  role: "user" | "assistant";
  parts: MessagePart[];
  streaming: boolean;
}) {
  if (role === "user") {
    const text = parts
      .filter((p): p is { kind: "text"; value: string } => p.kind === "text")
      .map((p) => p.value)
      .join("");
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  if (parts.length === 0) {
    return <span className="text-subtle">{streaming ? "…" : ""}</span>;
  }

  return (
    <div className="space-y-2">
      {parts.map((p, i) =>
        p.kind === "text" ? (
          p.value === "" ? null : (
            <Markdown key={i}>{p.value}</Markdown>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`/api/conversation-outputs/${p.outputId}`}
            alt={p.filename}
            className="my-1 max-w-full rounded-md border border-border"
          />
        ),
      )}
    </div>
  );
}
