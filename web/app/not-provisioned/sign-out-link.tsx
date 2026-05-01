"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutLink() {
  const clerk = useClerk();
  return (
    <button
      onClick={() => clerk.signOut({ redirectUrl: "/" })}
      className="mt-8 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
    >
      Sign out
    </button>
  );
}
