import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const supabase = await createServiceSupabase();
    let query = supabase
      .from("production_log")
      .select("*, staff:made_by(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      (data || []).map((r) => ({
        ...r,
        staff_name: (r.staff as unknown as { name: string })?.name || "—",
      }))
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const session = await getStaffSession();
    const body = await request.json();
    const { date, item, quantity, unit, notes } = body;

    if (!item || !quantity) {
      return NextResponse.json({ error: "Item and quantity required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();

    const { data, error } = await supabase
      .from("production_log")
      .insert({
        date: date || new Date().toISOString().split("T")[0],
        item,
        quantity,
        unit: unit || "pcs",
        made_by: session?.staffId || null,
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
      table_name: "production_log",
      record_id: data.id,
      new_data: body,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
