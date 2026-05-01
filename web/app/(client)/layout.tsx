import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { ClientNav } from "./nav";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireClient();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-brand"
            >
              Nexus
            </Link>
            <span aria-hidden className="h-5 w-px bg-border-strong" />
            <ClientNav />
          </div>
          <UserButton />
        </div>
      </header>
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
