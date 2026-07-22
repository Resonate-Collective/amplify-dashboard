import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Public paths that must be reachable without a session.
const PUBLIC = new Set(["/signin", "/denied", "/api/health"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.has(pathname) || pathname.startsWith("/api/auth");
  if (!req.auth && !isPublic) {
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
