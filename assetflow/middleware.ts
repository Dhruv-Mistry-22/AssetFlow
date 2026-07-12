import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for route protection.
 * Redirects unauthenticated users to /auth/login for protected routes.
 * API routes return 401 JSON if no session.
 */
export default auth((req: NextRequest & { auth: { user?: { id: string; role: string } } | null }) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiRoute = nextUrl.pathname.startsWith("/api/");
  const isAuthRoute = nextUrl.pathname.startsWith("/auth/");
  const isPublicApiRoute =
    nextUrl.pathname.startsWith("/api/auth/") ||
    nextUrl.pathname.startsWith("/api/slack-alert") ||
    nextUrl.pathname.startsWith("/api/sync");

  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  // Allow auth API routes always
  if (isPublicApiRoute) return NextResponse.next();

  // API routes: return 401 if not logged in
  if (isApiRoute && !isLoggedIn) {
    return NextResponse.json(
      { error: "Unauthorized: Please sign in" },
      { status: 401 }
    );
  }

  // Auth pages: redirect to dashboard if already logged in
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Dashboard pages: redirect to login if not logged in
  if (isDashboardRoute && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow root '/' and any other non-dashboard/non-api route to pass publicly
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
