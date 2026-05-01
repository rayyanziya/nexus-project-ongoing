import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listProjects } from "@/lib/queries/projects";
import { SELECTABLE_DOCUMENT_TYPES } from "@/lib/queries/documents";
import { createDocumentAction } from "../actions";

export default async function NewDocumentPage() {
  await requireAdmin();
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href="/admin/documents"
        className="text-sm text-subtle transition-colors hover:text-brand"
      >
        ← Documents
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
        New document
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Creates a draft. The official number is allocated only when you
        click Issue.
      </p>

      <form action={createDocumentAction} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Type
            </span>
            <select
              name="docType"
              required
              defaultValue=""
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="" disabled>
                Pick a document type…
              </option>
              {SELECTABLE_DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} — {t.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-subtle">
              Invoices use the dedicated Invoices module instead.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Project
            </span>
            <select
              name="projectId"
              defaultValue="INTERNAL"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="INTERNAL">Internal (INT)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} ({p.clientName})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Title
          </span>
          <input
            name="title"
            required
            placeholder="e.g. Discovery workshop proposal — PT ABC"
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            File (optional)
          </span>
          <input
            type="file"
            name="file"
            className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand hover:file:bg-brand-soft/80"
          />
          <span className="text-xs text-subtle">
            Upload now or later from the document detail page. 500MB max.
          </span>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
          >
            Create draft
          </button>
          <Link
            href="/admin/documents"
            className="cursor-pointer rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-soft"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
