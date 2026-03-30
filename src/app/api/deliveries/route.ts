import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    const body = await request.json();
    const { supplier, items_json, notes } = body;

    if (!supplier) {
      return NextResponse.json({ error: "Supplier required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();

    const { data, error } = await supabase
      .from("deliveries")
      .insert({
        supplier,
        items_json: items_json || [],
        received_by: session?.staffId || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    await supabase.from("audit_log").insert({
      user_id: session?.staffId || null,
      action: "create",
      table_name: "deliveries",
      record_id: data.id,
      new_data: body,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
