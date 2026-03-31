import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession, hashPin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const { newPin } = await request.json();

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const pinHash = await hashPin(newPin);
    const supabase = await createServiceSupabase();

    const { error } = await supabase
      .from("staff")
      .update({ pin_hash: pinHash, must_change_pin: false })
      .eq("id", session.staffId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("audit_log").insert({
      user_id: session.staffId,
      action: "change_pin",
      table_name: "staff",
      record_id: session.staffId,
      new_data: { name: session.staffName, self_changed: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
