import { SignOutLink } from "./sign-out-link";

export default function NotProvisionedPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Your account isn&apos;t provisioned yet
        </h1>
        <p className="mt-3 text-muted">
          Your GDI account manager needs to add you to a project before you can
          access the portal. Please contact them, then sign in again.
        </p>
        <SignOutLink />
      </div>
    </main>
  );
}
