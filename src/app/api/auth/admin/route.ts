import { NextResponse } from "next/server";
import { setAdminSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const adminHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminHash) {
      // Fallback: if no hash set, check plain password against env
      // This is only for initial setup
      const adminPlain = process.env.ADMIN_PASSWORD || "admin123";
      if (password !== adminPlain) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    } else {
      const valid = await bcrypt.compare(password, adminHash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    await setAdminSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
