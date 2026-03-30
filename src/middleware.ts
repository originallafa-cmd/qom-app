import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Staff routes protection
  if (pathname.startsWith("/staff") && !pathname.startsWith("/staff/login")) {
    const session = request.cookies.get("qom_staff_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    try {
      const parsed = JSON.parse(session);
      if (parsed.expiresAt < Date.now()) {
        const response = NextResponse.redirect(new URL("/staff/login", request.url));
        response.cookies.delete("qom_staff_session");
        return response;
      }
    } catch {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
  }

  // Admin routes protection
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("qom_admin_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    try {
      const parsed = JSON.parse(session);
      if (parsed.expiresAt < Date.now()) {
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.delete("qom_admin_session");
        return response;
      }
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*"],
};
