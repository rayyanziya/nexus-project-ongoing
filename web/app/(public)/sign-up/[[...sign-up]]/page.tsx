"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.replace("/dashboard");
      return;
    }
    let done = false;
    const interval = setInterval(() => {
      if (done) return;
      const clerk = (window as unknown as { Clerk?: { session?: unknown } })
        .Clerk;
      if (clerk?.session) {
        done = true;
        window.location.replace("/dashboard");
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <SignUp
        forceRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: "var(--brand)",
            colorBackground: "var(--surface)",
            colorText: "var(--foreground)",
            borderRadius: "0.5rem",
          },
        }}
      />
    </main>
  );
}
