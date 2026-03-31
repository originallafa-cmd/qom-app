import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const supabase = await createServiceSupabase();
    let query = supabase
      .from("expenses_monthly")
      .select("*")
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (month) query = query.eq("month", month);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    const { month, item, amount, category, status, notes } = body;

    if (!month || !item || !amount || !category) {
      return NextResponse.json({ error: "Month, item, amount, category required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("expenses_monthly")
      .insert({
        month,
        item,
        amount,
        category,
        status: status || "pending",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
