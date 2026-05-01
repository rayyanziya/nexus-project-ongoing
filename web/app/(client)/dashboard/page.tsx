import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { listProjectsForClientUser } from "@/lib/queries/projects";
import { ProjectStatusBadge } from "./status-badge";

export default async function ClientDashboard() {
  const { clientUser } = await requireClient();
  const projects = await listProjectsForClientUser(clientUser.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Welcome, {clientUser.fullName ?? clientUser.email}
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Your active engagements with GDI.
      </p>

      <h2 className="mt-10 text-base font-semibold text-foreground">Your projects</h2>
      {projects.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            You haven&apos;t been added to any projects yet.
          </p>
          <p className="mt-1 text-xs text-subtle">
            Your GDI account manager will add you when projects are ready.
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/projects/${p.id}`}
                className="block rounded-lg border border-border bg-surface p-5 transition-colors hover:border-brand hover:bg-brand-soft/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {p.name}
                  </h3>
                  <ProjectStatusBadge status={p.status} />
                </div>
                {p.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {p.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-subtle">
                  Updated {p.updatedAt.toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
