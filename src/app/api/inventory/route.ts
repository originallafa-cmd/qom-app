import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // grocery | packaging | kitchen
    const status = searchParams.get("status"); // ok | low | out
    const search = searchParams.get("search");

    const supabase = await createServiceSupabase();
    let query = supabase
      .from("inventory_items")
      .select("*")
      .order("name");

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const body = await request.json();
    const { name, type, category, qty, unit, reorder_at, usage_rate, usage_period, priority, supplier, notes } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        name,
        type,
        category: category || null,
        qty: qty || 0,
        unit: unit || "pcs",
        reorder_at: reorder_at || 0,
        usage_rate: usage_rate || 0,
        usage_period: usage_period || "weekly",
        priority: priority || "normal",
        supplier: supplier || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
