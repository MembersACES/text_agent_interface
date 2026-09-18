import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PARTNER_PREFIXES = [
  "/clients",
  "/base-1",
  "/auth",
  "/api/auth",
  "/_next",
  "/images",
  "/favicon",
];

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_PARTNER_MODE !== "1") {
    return NextResponse.next();
  }
  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.next();
  if (PARTNER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
