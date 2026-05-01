"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/app/_components/markdown";
import { formatBytes } from "@/lib/format";
import type { ViewerSelf, WireComment, WirePost } from "./types";

const ADMIN_LABEL = "GDI";

export function PostCard({
  projectId,
  post,
  viewer,
  onPostUpdated,
  onPostDeleted,
}: {
  projectId: string;
  post: WirePost;
  viewer: ViewerSelf;
  onPostUpdated: (post: WirePost) => void;
  onPostDeleted: (postId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isAdmin = viewer.kind === "admin";

  return (
    <article className="rounded-lg border border-border bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{ADMIN_LABEL}</p>
          <p className="text-xs text-subtle">{formatTimestamp(post.createdAt)}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-1.5">
            {post.forAiContext && (
              <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                AI
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                post.clientVisible
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {post.clientVisible ? "Client visible" : "Internal"}
            </span>
          </div>
        )}
      </header>

      <div className="px-4 py-3">
        {editing && isAdmin ? (
          <PostEditor
            projectId={projectId}
            post={post}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              onPostUpdated(updated);
              setEditing(false);
            }}
            onFileDeleted={(fileId) =>
              onPostUpdated({
                ...post,
                files: post.files.filter((f) => f.id !== fileId),
              })
            }
          />
        ) : (
          <>
            {post.body && (
              <div className="text-sm leading-relaxed text-foreground">
                <Markdown>{post.body}</Markdown>
              </div>
            )}
            {post.files.length > 0 && (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded border border-border">
                {post.files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <a
                      href={`/api/files/${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-brand hover:underline"
                    >
                      {f.filename}
                    </a>
                    <span className="shrink-0 text-xs text-subtle">
                      {formatBytes(f.fileSize)}
                    </span>
                    <a
                      href={`/api/files/${f.id}?download=1`}
                      className="shrink-0 text-xs font-medium text-brand hover:underline"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {isAdmin && !editing && (
          <div className="mt-3 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="cursor-pointer font-medium text-subtle transition-colors hover:text-brand"
            >
              Edit
            </button>
            <DeletePostButton
              projectId={projectId}
              postId={post.id}
              onDeleted={() => onPostDeleted(post.id)}
            />
          </div>
        )}
      </div>

      <CommentSection projectId={projectId} post={post} viewer={viewer} />
    </article>
  );
}

function DeletePostButton({
  projectId,
  postId,
  onDeleted,
}: {
  projectId: string;
  postId: string;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!window.confirm("Delete this post? Comments will be hidden too.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/posts/${postId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      onDeleted();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="cursor-pointer font-medium text-subtle transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}

function PostEditor({
  projectId,
  post,
  onCancel,
  onSaved,
  onFileDeleted,
}: {
  projectId: string;
  post: WirePost;
  onCancel: () => void;
  onSaved: (post: WirePost) => void;
  onFileDeleted: (fileId: string) => void;
}) {
  const [body, setBody] = useState(post.body ?? "");
  const [forAiContext, setForAiContext] = useState(post.forAiContext);
  const [clientVisible, setClientVisible] = useState(post.clientVisible);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  async function deleteFile(fileId: string, filename: string) {
    if (deletingFileId) return;
    if (!window.confirm(`Remove "${filename}" from this post?`)) return;
    setDeletingFileId(fileId);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/posts/${post.id}/files/${fileId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      onFileDeleted(fileId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingFileId(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/posts/${post.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: body.trim() || null,
            forAiContext,
            clientVisible,
          }),
        },
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(
          (detail && typeof detail === "object" && "error" in detail
            ? String((detail as { error?: string }).error)
            : null) || `Save failed (${res.status})`,
        );
      }
      const data = (await res.json()) as { post: Omit<WirePost, "files"> };
      onSaved({ ...data.post, files: post.files });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      {post.files.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded border border-border">
          {post.files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">
                {f.filename}
              </span>
              <span className="shrink-0 text-xs text-subtle">
                {formatBytes(f.fileSize)}
              </span>
              <button
                type="button"
                onClick={() => deleteFile(f.id, f.filename)}
                disabled={deletingFileId === f.id}
                className="shrink-0 cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingFileId === f.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="cursor-pointer accent-brand"
            />
            <span>Visible to client</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={forAiContext}
              onChange={(e) => setForAiContext(e.target.checked)}
              className="cursor-pointer accent-brand"
            />
            <span>Use as AI context</span>
          </label>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-md border border-border-strong px-3 py-1.5 font-medium text-subtle transition-colors hover:bg-brand-soft/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-md bg-brand px-3 py-1.5 font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </form>
  );
}

function CommentSection({
  projectId,
  post,
  viewer,
}: {
  projectId: string;
  post: WirePost;
  viewer: ViewerSelf;
}) {
  const [comments, setComments] = useState<WireComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/posts/${post.id}/comments`,
        );
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = (await res.json()) as { comments: WireComment[] };
        if (!cancelled) setComments(data.comments);
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
  }, [projectId, post.id]);

  function onCommentCreated(comment: WireComment) {
    setComments((prev) => [...prev, comment]);
    setReplyingTo(null);
  }

  function onCommentUpdated(comment: WireComment) {
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? comment : c)),
    );
  }

  function onCommentDeleted(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  const topLevel = comments.filter((c) => c.parentCommentId === null);
  const repliesByParent = new Map<string, WireComment[]>();
  for (const c of comments) {
    if (c.parentCommentId) {
      const arr = repliesByParent.get(c.parentCommentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentCommentId, arr);
    }
  }

  return (
    <div className="border-t border-border bg-brand-soft/30 px-4 py-3">
      {error && (
        <p className="mb-2 text-xs text-red-700">{error}</p>
      )}
      {loading ? (
        <p className="text-xs text-subtle">Loading comments…</p>
      ) : (
        <ul className="space-y-3">
          {topLevel.map((c) => (
            <li key={c.id}>
              <CommentRow
                projectId={projectId}
                postId={post.id}
                comment={c}
                viewer={viewer}
                onUpdated={onCommentUpdated}
                onDeleted={onCommentDeleted}
              />
              <ul className="mt-2 ml-6 space-y-2 border-l border-border-strong pl-3">
                {(repliesByParent.get(c.id) ?? []).map((r) => (
                  <li key={r.id}>
                    <CommentRow
                      projectId={projectId}
                      postId={post.id}
                      comment={r}
                      viewer={viewer}
                      onUpdated={onCommentUpdated}
                      onDeleted={onCommentDeleted}
                    />
                  </li>
                ))}
                {replyingTo === c.id ? (
                  <li>
                    <CommentForm
                      projectId={projectId}
                      postId={post.id}
                      parentCommentId={c.id}
                      onCreated={onCommentCreated}
                      onCancel={() => setReplyingTo(null)}
                      placeholder="Write a reply…"
                    />
                  </li>
                ) : (
                  <li>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(c.id)}
                      className="cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-brand"
                    >
                      Reply
                    </button>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <CommentForm
          projectId={projectId}
          postId={post.id}
          parentCommentId={null}
          onCreated={onCommentCreated}
          placeholder="Write a comment…"
        />
      </div>
    </div>
  );
}

function CommentRow({
  projectId,
  postId,
  comment,
  viewer,
  onUpdated,
  onDeleted,
}: {
  projectId: string;
  postId: string;
  comment: WireComment;
  viewer: ViewerSelf;
  onUpdated: (c: WireComment) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);

  const isOwn =
    (comment.authorType === "admin" &&
      viewer.kind === "admin" &&
      comment.authorAdminId === viewer.clerkUserId) ||
    (comment.authorType === "client" &&
      viewer.kind === "client" &&
      comment.authorClientUserId === viewer.clientUserId);
  const canEdit = isOwn;
  const canDelete = isOwn || viewer.kind === "admin";

  async function save() {
    if (busy) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError("Body is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/posts/${postId}/comments/${comment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        },
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = (await res.json()) as { comment: Omit<WireComment, "authorDisplayName"> };
      onUpdated({ ...data.comment, authorDisplayName: comment.authorDisplayName });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/posts/${postId}/comments/${comment.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      onDeleted(comment.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          {comment.authorDisplayName}
          <span className="ml-1.5 font-normal text-subtle">
            {formatTimestamp(comment.createdAt)}
          </span>
        </span>
        {(canEdit || canDelete) && !editing && (
          <span className="flex items-center gap-2 text-[11px]">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
                className="cursor-pointer font-medium text-subtle transition-colors hover:text-brand"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="cursor-pointer font-medium text-subtle transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </span>
        )}
      </div>
      {editing ? (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={busy}
              className="cursor-pointer rounded-md border border-border-strong px-2 py-1 font-medium text-subtle transition-colors hover:bg-brand-soft/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="cursor-pointer rounded-md bg-brand px-2 py-1 font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {comment.body}
        </p>
      )}
    </div>
  );
}

function CommentForm({
  projectId,
  postId,
  parentCommentId,
  onCreated,
  onCancel,
  placeholder,
}: {
  projectId: string;
  postId: string;
  parentCommentId: string | null;
  onCreated: (comment: WireComment) => void;
  onCancel?: () => void;
  placeholder: string;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed, parentCommentId }),
        },
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(
          (detail && typeof detail === "object" && "error" in detail
            ? String((detail as { error?: string }).error)
            : null) || `Failed (${res.status})`,
        );
      }
      const data = (await res.json()) as { comment: WireComment };
      onCreated(data.comment);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <div className="flex items-center justify-end gap-2 text-xs">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-md border border-border-strong px-2 py-1 font-medium text-subtle transition-colors hover:bg-brand-soft/60"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy || body.trim().length === 0}
          className="cursor-pointer rounded-md bg-brand px-3 py-1 font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "…" : "Post"}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </form>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
