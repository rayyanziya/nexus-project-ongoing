import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listProjects } from "@/lib/queries/projects";
import { getDocumentById } from "@/lib/queries/documents";
import { DOCUMENT_TYPES } from "@/lib/document-numbering";
import { formatBytes } from "@/lib/format";
import { ConfirmActionButton } from "@/app/_components/confirm-action-button";
import { DocumentFileSection } from "./file-section";
import { deleteDocumentAction, updateDocumentAction } from "../actions";
import { IssueDocumentButton } from "./issue-button";

export default async function AdminDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [doc, allProjects] = await Promise.all([
    getDocumentById(id),
    listProjects(),
  ]);
  if (!doc) notFound();

  const updateAction = updateDocumentAction.bind(null, id);
  const isDraft = doc.documentNumber === null;
  const typeLabel =
    DOCUMENT_TYPES[doc.docType as keyof typeof DOCUMENT_TYPES] ?? doc.docType;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link
        href="/admin/documents"
        className="text-sm text-subtle transition-colors hover:text-brand"
      >
        ← Documents
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-subtle">
            {doc.documentNumber ?? (
              <span className="italic">draft (number assigned at issue)</span>
            )}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {doc.title}
          </h1>
          <p className="mt-1 text-sm text-subtle">
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
              {doc.docType}
            </span>{" "}
            {typeLabel}
            {doc.projectId && doc.projectName ? (
              <>
                {" · "}
                <Link
                  href={`/admin/projects/${doc.projectId}`}
                  className="hover:underline"
                >
                  {doc.projectCode} — {doc.projectName}
                </Link>
              </>
            ) : (
              " · Internal"
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-sm px-2.5 py-0.5 text-xs font-medium ${
            isDraft
              ? "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          }`}
        >
          {isDraft ? "Draft" : "Issued"}
        </span>
      </div>

      <form action={updateAction} className="mt-6 space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Title
          </span>
          <input
            name="title"
            defaultValue={doc.title}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        {isDraft && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Project
            </span>
            <select
              name="projectId"
              defaultValue={doc.projectId ?? "INTERNAL"}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="INTERNAL">Internal (INT)</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} ({p.clientName})
                </option>
              ))}
            </select>
            <span className="text-xs text-subtle">
              Locked once issued — the project code is baked into the
              document number.
            </span>
          </label>
        )}

        <button
          type="submit"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Save changes
        </button>
      </form>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">File</h2>
        {doc.filename && doc.r2Key && doc.fileSize !== null ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden>📎</span>
              <a
                href={`/api/admin/documents/${id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-brand hover:underline"
              >
                {doc.filename}
              </a>
              <span className="shrink-0 text-xs text-subtle">
                {formatBytes(doc.fileSize)}
              </span>
              <a
                href={`/api/admin/documents/${id}/file?download=1`}
                className="shrink-0 text-xs font-medium text-brand hover:underline"
              >
                Download
              </a>
            </div>
            <DocumentFileSection documentId={id} hasFile />
          </div>
        ) : (
          <div className="mt-3">
            <DocumentFileSection documentId={id} hasFile={false} />
          </div>
        )}
      </section>

      <section className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Lifecycle</h2>
        <p className="mt-1 text-sm text-subtle">
          Issuing allocates the next official number for this type+project
          combination. Numbers are never reused — even after deletion the
          sequence continues.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="State">{isDraft ? "Draft" : "Issued"}</Field>
          <Field label="Issued at">
            {doc.issuedAt ? doc.issuedAt.toLocaleString() : "—"}
          </Field>
          <Field label="Created">
            {doc.createdAt.toLocaleString()}
          </Field>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isDraft && <IssueDocumentButton documentId={id} />}
          <ConfirmActionButton
            action={deleteDocumentAction.bind(null, id)}
            message="Delete this document permanently? The number is retired and cannot be reused."
            label="Delete document"
            pendingLabel="Deleting…"
            variant="danger-soft"
            redirectTo="/admin/documents"
          />
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
