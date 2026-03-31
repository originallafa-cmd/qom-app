import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("equity_ledger")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const currentBalance = data?.[0]?.running_total ?? 0;
    return NextResponse.json({ entries: data || [], currentBalance });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const body = await request.json();
    const { date, type, amount, description } = body;

    if (!type || amount === undefined) {
      return NextResponse.json({ error: "Type and amount required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();

    // Get current running total
    const { data: latest } = await supabase
      .from("equity_ledger")
      .select("running_total")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const prevTotal = latest?.running_total ?? 0;
    let newTotal = prevTotal;

    if (type === "personal_from_biz") {
      newTotal = prevTotal + amount; // Mohamed takes from biz — owes more
    } else if (type === "personal_into_biz") {
      newTotal = prevTotal - amount; // Mohamed puts back — owes less
    } else {
      newTotal = amount; // adjustment — set directly
    }

    const { data, error } = await supabase
      .from("equity_ledger")
      .insert({
        date: date || new Date().toISOString().split("T")[0],
        type,
        amount,
        description: description || null,
        running_total: newTotal,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
