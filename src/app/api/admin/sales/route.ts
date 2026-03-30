import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const view = searchParams.get("view") || "daily"; // daily | weekly | monthly

    const supabase = await createServiceSupabase();

    let query = supabase
      .from("daily_sales")
      .select(
        "id, date, cash, card, talabat, total, expenses, net, notes, opening_cash, pt_cash, closing_cash, staff:staff_id(name), expense_items(id, description, amount, category)"
      )
      .order("date", { ascending: false });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []).map((r) => ({
      id: r.id,
      date: r.date,
      cash: r.cash,
      card: r.card,
      talabat: r.talabat,
      total: r.total,
      expenses: r.expenses,
      net: r.net,
      notes: r.notes,
      opening_cash: r.opening_cash,
      pt_cash: r.pt_cash,
      closing_cash: r.closing_cash,
      staff_name: (r.staff as unknown as { name: string })?.name || "—",
      expense_items: r.expense_items || [],
    }));

    if (view === "daily") {
      return NextResponse.json({ rows, view });
    }

    // Weekly aggregation
    if (view === "weekly") {
      const weeks: Record<string, typeof rows> = {};
      rows.forEach((r) => {
        const d = new Date(r.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split("T")[0];
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(r);
      });

      const weeklyRows = Object.entries(weeks)
        .map(([weekStart, dayRows]) => ({
          weekStart,
          weekEnd: new Date(
            new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          days: dayRows.length,
          cash: dayRows.reduce((s, r) => s + r.cash, 0),
          card: dayRows.reduce((s, r) => s + r.card, 0),
          talabat: dayRows.reduce((s, r) => s + r.talabat, 0),
          total: dayRows.reduce((s, r) => s + r.total, 0),
          expenses: dayRows.reduce((s, r) => s + r.expenses, 0),
          net: dayRows.reduce((s, r) => s + r.net, 0),
          avgDaily:
            dayRows.reduce((s, r) => s + r.total, 0) / (dayRows.length || 1),
        }))
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

      return NextResponse.json({ rows: weeklyRows, view });
    }

    // Monthly aggregation
    if (view === "monthly") {
      const months: Record<string, typeof rows> = {};
      rows.forEach((r) => {
        const key = r.date.slice(0, 7);
        if (!months[key]) months[key] = [];
        months[key].push(r);
      });

      const monthlyRows = Object.entries(months)
        .map(([month, dayRows]) => ({
          month,
          days: dayRows.length,
          cash: dayRows.reduce((s, r) => s + r.cash, 0),
          card: dayRows.reduce((s, r) => s + r.card, 0),
          talabat: dayRows.reduce((s, r) => s + r.talabat, 0),
          total: dayRows.reduce((s, r) => s + r.total, 0),
          expenses: dayRows.reduce((s, r) => s + r.expenses, 0),
          net: dayRows.reduce((s, r) => s + r.net, 0),
          avgDaily:
            dayRows.reduce((s, r) => s + r.total, 0) / (dayRows.length || 1),
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      return NextResponse.json({ rows: monthlyRows, view });
    }

    return NextResponse.json({ rows, view: "daily" });
  } catch (err) {
    console.error("Sales report API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
