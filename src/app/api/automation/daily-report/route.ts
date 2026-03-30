import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

// Auto-generate daily report when called (can be triggered by cron or after staff submission)
export async function POST() {
  try {
    const supabase = await createServiceSupabase();
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);

    // Today's sales
    const { data: todaySales } = await supabase
      .from("daily_sales")
      .select("*")
      .eq("date", today)
      .single();

    if (!todaySales) {
      return NextResponse.json({ message: "No sales entry for today yet" });
    }

    // Month to date
    const { data: monthSales } = await supabase
      .from("daily_sales")
      .select("total, expenses")
      .gte("date", currentMonth + "-01")
      .lte("date", today);

    const monthTotal = (monthSales || []).reduce((s, r) => s + (r.total || 0), 0);
    const monthDays = (monthSales || []).length;

    // Inventory alerts
    const { data: alerts } = await supabase
      .from("inventory_items")
      .select("name, type, qty, status")
      .in("status", ["out", "low"]);

    const outItems = (alerts || []).filter((a) => a.status === "out");
    const lowItems = (alerts || []).filter((a) => a.status === "low");

    // Create notification with daily summary
    await supabase.from("notifications").insert({
      type: "sales",
      severity: "info",
      message: `Daily Report ${today}: Total ${todaySales.total.toFixed(2)} AED (Cash ${todaySales.cash}, Card ${todaySales.card}, Talabat ${todaySales.talabat}). Expenses: ${todaySales.expenses}. Month total: ${monthTotal.toFixed(0)} (${monthDays} days, avg ${(monthTotal / monthDays).toFixed(0)}/day)`,
      data: {
        date: today,
        today: todaySales,
        month: { total: monthTotal, days: monthDays, avg: monthTotal / monthDays },
      },
    });

    // Low revenue alert
    if (todaySales.total < 500) {
      await supabase.from("notifications").insert({
        type: "sales",
        severity: "warning",
        message: `Low revenue alert: ${today} total was only ${todaySales.total.toFixed(2)} AED (threshold: 500)`,
        data: { date: today, total: todaySales.total },
      });
    }

    // Inventory alerts
    if (outItems.length > 0) {
      await supabase.from("notifications").insert({
        type: "inventory",
        severity: "critical",
        message: `${outItems.length} items OUT OF STOCK: ${outItems.map((i) => i.name).join(", ")}`,
        data: { items: outItems },
      });
    }

    return NextResponse.json({
      success: true,
      report: {
        date: today,
        today: todaySales,
        monthTotal,
        monthDays,
        outOfStock: outItems.length,
        lowStock: lowItems.length,
      },
    });
  } catch (err) {
    console.error("Daily report error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
