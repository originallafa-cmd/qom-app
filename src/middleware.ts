import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Staff routes protection — check cookie exists (real verification in API auth)
  if (pathname.startsWith("/staff") && !pathname.startsWith("/staff/login")) {
    const session = request.cookies.get("qom_staff_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    // Cookie is sealed by iron-session — we can't unseal in middleware
    // but its presence + httpOnly + maxAge provides basic protection
    // Real auth verification happens in API routes via getStaffSession()
  }

  // Admin routes protection
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("qom_admin_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*"],
};
