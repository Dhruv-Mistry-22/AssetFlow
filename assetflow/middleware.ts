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
    (nextUrl.pathname === "/api/access-requests" && req.method === "POST");
    
  const isPublicRoute = nextUrl.pathname === "/";

  // Allow auth and public API routes always
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

  // Allow landing page for all users
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protected pages: redirect to login if not logged in
  if (!isAuthRoute && !isApiRoute && !isPublicRoute && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
