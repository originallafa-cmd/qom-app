import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { hashPin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { staffName, newPin } = await request.json();

    if (!staffName || !newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "Staff name and 4-digit PIN required" }, { status: 400 });
    }

    const pinHash = await hashPin(newPin);
    const supabase = await createServiceSupabase();

    const { error } = await supabase
      .from("staff")
      .update({ pin_hash: pinHash })
      .eq("name", staffName);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    await supabase.from("audit_log").insert({
      action: "update_pin",
      table_name: "staff",
      new_data: { staffName, pin_changed: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
