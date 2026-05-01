"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "./post-card";
import type { ViewerSelf, WirePost } from "./types";

export function ProjectFeed({
  projectId,
  viewer,
}: {
  projectId: string;
  viewer: ViewerSelf;
}) {
  const [posts, setPosts] = useState<WirePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/posts`);
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = (await res.json()) as { posts: WirePost[] };
        if (!cancelled) setPosts(data.posts);
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

  const onPostCreated = useCallback((post: WirePost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const onPostUpdated = useCallback((post: WirePost) => {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
  }, []);

  const onPostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold text-foreground">Project feed</h2>
      <p className="mt-1 text-sm text-subtle">
        {viewer.kind === "admin"
          ? "Post updates, attach files, and respond to client questions."
          : "Updates from GDI on this project. Comment to ask questions or request changes."}
      </p>

      {viewer.kind === "admin" && (
        <Compose projectId={projectId} onCreated={onPostCreated} />
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-subtle">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted">
            {viewer.kind === "admin"
              ? "No posts yet. Compose one above."
              : "No posts yet."}
          </p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              projectId={projectId}
              post={post}
              viewer={viewer}
              onPostUpdated={onPostUpdated}
              onPostDeleted={onPostDeleted}
            />
          ))
        )}
      </div>
    </section>
  );
}

function Compose({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: (post: WirePost) => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [forAiContext, setForAiContext] = useState(false);
  const [clientVisible, setClientVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list);
    setFiles((prev) => [...prev, ...next]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = body.trim();
    if (trimmed.length === 0 && files.length === 0) {
      setError("Add a body or attach a file.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      if (trimmed.length > 0) fd.append("body", trimmed);
      if (forAiContext) fd.append("forAiContext", "on");
      fd.append("clientVisible", clientVisible ? "on" : "off");
      for (const f of files) fd.append("files", f);

      const res = await fetch(`/api/admin/projects/${projectId}/posts`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(
          (detail && typeof detail === "object" && "error" in detail
            ? String((detail as { error?: string }).error)
            : null) || `Failed (${res.status})`,
        );
      }
      const data = (await res.json()) as { post: WirePost };
      onCreated(data.post);
      setBody("");
      setFiles([]);
      setForAiContext(false);
      setClientVisible(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Share an update with the client…"
        className="w-full resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded border border-border bg-brand-soft/40 px-2 py-1 text-xs"
            >
              <span className="max-w-[14rem] truncate font-medium text-foreground">
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="cursor-pointer text-subtle transition-colors hover:text-red-700"
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            Attach files
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="cursor-pointer accent-brand"
            />
            <span>Visible to client</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={forAiContext}
              onChange={(e) => setForAiContext(e.target.checked)}
              className="cursor-pointer accent-brand"
            />
            <span>Use as AI context</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </form>
  );
}
