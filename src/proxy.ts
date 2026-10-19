import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for the admin area: if there is no session cookie at all, go to the login page.
 * This is only a convenience — real authentication and authorisation happen on the server in
 * every admin page, server action and route handler (see src/lib/auth/dal.ts).
 */
const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname === p)) return NextResponse.next();
  const hasSession = request.cookies.has("__Host-hrf_admin") || request.cookies.has("hrf_admin");
  if (!hasSession) {
    if (pathname.startsWith("/admin/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
