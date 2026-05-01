import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-5">
            <Link
              href="/admin"
              className="text-sm font-semibold tracking-tight text-brand"
            >
              Nexus · Admin
            </Link>
            <span aria-hidden className="h-5 w-px bg-border-strong" />
            <AdminNav />
          </div>
          <UserButton />
        </div>
      </header>
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
