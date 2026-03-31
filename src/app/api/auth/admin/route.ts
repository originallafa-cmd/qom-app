import { NextResponse } from "next/server";
import { setAdminSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limit = checkRateLimit(`admin-login:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in " + Math.ceil(limit.resetIn / 60000) + " minutes." },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const adminHash = process.env.ADMIN_PASSWORD_HASH;
    const adminPlain = process.env.ADMIN_PASSWORD;

    if (adminHash) {
      const valid = await bcrypt.compare(password, adminHash);
      if (!valid) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } else if (adminPlain) {
      if (password !== adminPlain) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } else {
      return NextResponse.json({ error: "Admin login not configured" }, { status: 500 });
    }

    resetRateLimit(`admin-login:${ip}`);
    await setAdminSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
