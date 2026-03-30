import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { setStaffSession, verifyStaffPin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("id, name, pin_hash, role, active")
      .eq("active", true)
      .eq("role", "staff");

    if (error || !staffList) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Check PIN against all active staff
    for (const staff of staffList) {
      if (!staff.pin_hash) continue;
      const match = await verifyStaffPin(pin, staff.pin_hash);
      if (match) {
        await setStaffSession(staff.id, staff.name);
        return NextResponse.json({ success: true, name: staff.name });
      }
    }

    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
