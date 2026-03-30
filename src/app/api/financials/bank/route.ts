import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const supabase = await createServiceSupabase();
    let query = supabase
      .from("bank_transactions")
      .select("*")
      .order("date", { ascending: false });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query.limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Latest balance
    const latest = data?.[0];
    return NextResponse.json({
      transactions: data || [],
      currentBalance: latest?.balance ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, debit, credit, balance, biz_or_personal, category, ref_no, notes } = body;

    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("bank_transactions")
      .insert({
        date,
        description,
        debit: debit || 0,
        credit: credit || 0,
        balance: balance || null,
        biz_or_personal: biz_or_personal || "biz",
        category: category || null,
        ref_no: ref_no || null,
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
