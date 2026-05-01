import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-brand">
          PT Global Dataverse Indonesia
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Nexus
        </h1>
        <p className="mt-4 text-muted">
          Client portal for active GDI engagements. Sign in to access your
          project workspace.
        </p>
        <Link
          href="/sign-in"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
