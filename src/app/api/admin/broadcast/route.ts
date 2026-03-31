import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/api-auth";

// Admin pushes a message to all staff
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const supabase = await createServiceSupabase();
    await supabase.from("notifications").insert({
      type: "system",
      severity: "info",
      message,
      data: { broadcast: true, from: "admin" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
