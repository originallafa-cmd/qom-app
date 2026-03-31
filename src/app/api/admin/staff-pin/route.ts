import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { hashPin } from "@/lib/auth";
import { requireAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const { staffId, staffName, newPin } = await request.json();

    if ((!staffId && !staffName) || !newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "Staff ID (or name) and 4-digit PIN required" }, { status: 400 });
    }

    const pinHash = await hashPin(newPin);
    const supabase = await createServiceSupabase();

    // Prefer lookup by ID; fall back to name
    let query = supabase.from("staff").update({ pin_hash: pinHash });
    if (staffId) {
      query = query.eq("id", staffId);
    } else {
      query = query.eq("name", staffName);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    await supabase.from("audit_log").insert({
      action: "update_pin",
      table_name: "staff",
      record_id: staffId || null,
      new_data: { staffId, staffName, pin_changed: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
