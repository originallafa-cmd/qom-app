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
      .select("id, name, pin_hash, role, active, must_change_pin")
      .eq("active", true)
      .in("role", ["staff", "manager"]);

    if (error || !staffList) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Check PIN against all active staff + managers
    for (const staff of staffList) {
      if (!staff.pin_hash) continue;
      const match = await verifyStaffPin(pin, staff.pin_hash);
      if (match) {
        await setStaffSession(staff.id, staff.name);

        // Log login
        await supabase.from("audit_log").insert({
          user_id: staff.id,
          action: "login",
          table_name: "staff",
          record_id: staff.id,
          new_data: { name: staff.name, role: staff.role },
        });

        return NextResponse.json({
          success: true,
          name: staff.name,
          role: staff.role,
          mustChangePin: staff.must_change_pin ?? false,
        });
      }
    }

    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
