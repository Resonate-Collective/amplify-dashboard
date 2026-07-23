import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Public pages reachable without a session.
const PUBLIC = new Set(["/signin", "/denied"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && !PUBLIC.has(pathname)) {
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Exclude ALL of /api (the auth routes must not be double-processed by this
  // middleware; /api/metrics guards itself, /api/health is public) plus Next
  // internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
