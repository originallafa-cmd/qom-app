import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("daily_sales")
      .select("id, date, cash, card, talabat, total, expenses, net, staff:staff_id(name)")
      .order("date", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries = (data || []).map((row) => ({
      id: row.id,
      date: row.date,
      cash: row.cash,
      card: row.card,
      talabat: row.talabat,
      total: row.total,
      expenses: row.expenses,
      net: row.net,
      staff_name: (row.staff as unknown as { name: string })?.name || "—",
    }));

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
