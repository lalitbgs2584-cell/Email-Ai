import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve Better Auth session cookie (handles both HTTP and HTTPS cookie names)
  const sessionCookie = getSessionCookie(request);

  const isAuthRoute = pathname === "/sign-in";
  const isProtectedRoute = pathname.startsWith("/dashboard");

  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in"],
};
