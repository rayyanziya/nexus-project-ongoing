import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { getProjectForClientUser } from "@/lib/queries/projects";
import { ProjectFeed } from "@/app/_components/feed/project-feed";
import { ProjectStatusBadge } from "../../status-badge";
import { ProjectChat } from "./chat";

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clientUser } = await requireClient();
  const project = await getProjectForClientUser({
    projectId: id,
    clientUserId: clientUser.id,
  });
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-subtle transition-colors hover:text-brand"
      >
        ← All projects
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {project.name}
        </h1>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="mt-3 max-w-2xl text-sm text-muted">
          {project.description}
        </p>
      )}

      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        <Field label="Started">
          {project.startedAt ? project.startedAt.toLocaleDateString() : "—"}
        </Field>
        <Field label="Expected delivery">
          {project.expectedDeliveryAt
            ? project.expectedDeliveryAt.toLocaleDateString()
            : "—"}
        </Field>
        <Field label="Delivered">
          {project.deliveredAt ? project.deliveredAt.toLocaleDateString() : "—"}
        </Field>
      </dl>

      <ProjectFeed
        projectId={id}
        viewer={{
          kind: "client",
          clientUserId: clientUser.id,
          displayName: clientUser.fullName?.trim() || clientUser.email,
        }}
      />

      <ProjectChat projectId={id} />
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
      <dt className="text-xs font-medium uppercase tracking-wide text-subtle">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
