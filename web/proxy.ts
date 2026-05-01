import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/clerk/webhook",
]);

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isClientRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  const role = sessionClaims?.metadata?.role;
  const clientId = sessionClaims?.metadata?.client_id;
  const isAdmin = role === "admin";

  if (userId && isAuthRoute(req)) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin", req.url));
    if (clientId)
      return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.redirect(new URL("/not-provisioned", req.url));
  }

  if (isPublicRoute(req)) return;
  if (!userId) return redirectToSignIn();

  if (isAdminRoute(req) && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (isClientRoute(req)) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin", req.url));
    if (!clientId)
      return NextResponse.redirect(new URL("/not-provisioned", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
