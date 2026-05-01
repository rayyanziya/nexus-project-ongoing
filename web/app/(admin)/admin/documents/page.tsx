import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  listDocuments,
  SELECTABLE_DOCUMENT_TYPES,
} from "@/lib/queries/documents";
import { DOCUMENT_TYPES, isDocumentType } from "@/lib/document-numbering";
import { formatBytes } from "@/lib/format";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const docTypeParam = typeof params.type === "string" ? params.type : "";
  const stateParam = typeof params.state === "string" ? params.state : "";

  const filters: Parameters<typeof listDocuments>[0] = {};
  if (isDocumentType(docTypeParam)) filters.docType = docTypeParam;
  if (stateParam === "issued") filters.issuedOnly = true;
  else if (stateParam === "draft") filters.draftOnly = true;

  const docs = await listDocuments(filters);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Documents
          </h1>
          <p className="mt-1 text-sm text-subtle">
            Reserve official document numbers per the GDI numbering standard
            and attach the final file.
          </p>
        </div>
        <Link
          href="/admin/documents/new"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          New document
        </Link>
      </div>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Type
          </span>
          <select
            name="type"
            defaultValue={docTypeParam}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All types</option>
            {SELECTABLE_DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.value} — {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            State
          </span>
          <select
            name="state"
            defaultValue={stateParam}
            className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All</option>
            <option value="draft">Draft (no number yet)</option>
            <option value="issued">Issued</option>
          </select>
        </label>
        <button
          type="submit"
          className="cursor-pointer rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-soft"
        >
          Filter
        </button>
        <Link
          href="/admin/documents"
          className="cursor-pointer text-xs font-medium text-subtle transition-colors hover:text-brand"
        >
          Reset
        </Link>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Number</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Title</th>
              <th className="px-3 py-2 text-left font-medium">Project</th>
              <th className="px-3 py-2 text-left font-medium">File</th>
              <th className="px-3 py-2 text-left font-medium">Issued</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-subtle"
                >
                  No documents match these filters.
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-border transition-colors hover:bg-brand-soft/60"
                >
                  <td className="px-3 py-2 font-mono text-xs text-foreground">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="hover:underline"
                    >
                      {d.documentNumber ?? (
                        <span className="italic text-subtle">draft</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-subtle">
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                      {d.docType}
                    </span>{" "}
                    {DOCUMENT_TYPES[d.docType as keyof typeof DOCUMENT_TYPES] ??
                      d.docType}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="hover:underline"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-subtle">
                    {d.projectId && d.projectName ? (
                      <Link
                        href={`/admin/projects/${d.projectId}`}
                        className="hover:underline"
                      >
                        <span className="mr-1.5 inline-block rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                          {d.projectCode}
                        </span>
                        {d.projectName}
                      </Link>
                    ) : (
                      <span className="italic">Internal</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-subtle">
                    {d.filename ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden>📎</span>
                        <span className="max-w-[14rem] truncate">
                          {d.filename}
                        </span>
                        {d.fileSize !== null && (
                          <span className="text-xs text-muted">
                            {formatBytes(d.fileSize)}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-subtle">
                    {d.issuedAt ? d.issuedAt.toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
