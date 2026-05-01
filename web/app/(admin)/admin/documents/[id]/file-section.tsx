"use client";

import { useRef, useState, useTransition } from "react";
import {
  clearDocumentFileAction,
  uploadDocumentFileAction,
} from "../actions";

export function DocumentFileSection({
  documentId,
  hasFile,
}: {
  documentId: string;
  hasFile: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Pick a file first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await uploadDocumentFileAction(documentId, data);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onClear() {
    if (pending) return;
    if (!window.confirm("Remove the attached file?")) return;
    startTransition(async () => {
      await clearDocumentFileAction(documentId);
    });
  }

  if (hasFile) {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <form onSubmit={onUpload} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            name="file"
            className="hidden"
            onChange={(e) => {
              if (e.currentTarget.files?.length) {
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Uploading…" : "Replace"}
          </button>
        </form>
        <button
          type="button"
          onClick={onClear}
          disabled={pending}
          className="cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove
        </button>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={onUpload}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-4 text-sm"
    >
      <input
        ref={inputRef}
        type="file"
        name="file"
        className="cursor-pointer text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand hover:file:bg-brand-soft/80"
      />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </form>
  );
}
