import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServiceSupabase();
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";

    // Parallel queries
    const [
      todaySalesRes,
      monthSalesRes,
      inventoryAlertsRes,
      equityRes,
      bankRes,
      recentActivityRes,
    ] = await Promise.all([
      // Today's sales
      supabase
        .from("daily_sales")
        .select("cash, card, talabat, total, expenses, net")
        .eq("date", today)
        .single(),

      // Month sales
      supabase
        .from("daily_sales")
        .select("date, cash, card, talabat, total, expenses, net")
        .gte("date", monthStart)
        .lte("date", today)
        .order("date"),

      // Inventory alerts
      supabase
        .from("inventory_items")
        .select("id, name, type, qty, status")
        .in("status", ["out", "low"]),

      // Equity balance
      supabase
        .from("equity_ledger")
        .select("running_total")
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),

      // Bank balance
      supabase
        .from("bank_transactions")
        .select("balance")
        .order("date", { ascending: false })
        .limit(1)
        .single(),

      // Recent audit log
      supabase
        .from("audit_log")
        .select("id, action, table_name, created_at, user_id, staff:user_id(name)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Process month sales
    const monthSales = monthSalesRes.data || [];
    const monthTotalRevenue = monthSales.reduce((s, r) => s + (r.total || 0), 0);
    const monthTotalCash = monthSales.reduce((s, r) => s + (r.cash || 0), 0);
    const monthTotalCard = monthSales.reduce((s, r) => s + (r.card || 0), 0);
    const monthTotalTalabat = monthSales.reduce((s, r) => s + (r.talabat || 0), 0);
    const daysInMonth = monthSales.length || 1;

    // Inventory counts
    const inventoryAlerts = inventoryAlertsRes.data || [];
    const outCount = inventoryAlerts.filter((i) => i.status === "out").length;
    const lowCount = inventoryAlerts.filter((i) => i.status === "low").length;

    const dashboard = {
      today: todaySalesRes.data || { cash: 0, card: 0, talabat: 0, total: 0, expenses: 0, net: 0 },
      month: {
        revenue: monthTotalRevenue,
        avgDaily: monthTotalRevenue / daysInMonth,
        days: daysInMonth,
        channelSplit: {
          cash: monthTotalCash,
          cashPct: monthTotalRevenue > 0 ? (monthTotalCash / monthTotalRevenue) * 100 : 0,
          card: monthTotalCard,
          cardPct: monthTotalRevenue > 0 ? (monthTotalCard / monthTotalRevenue) * 100 : 0,
          talabat: monthTotalTalabat,
          talabatPct: monthTotalRevenue > 0 ? (monthTotalTalabat / monthTotalRevenue) * 100 : 0,
        },
        dailyData: monthSales.map((d) => ({
          date: d.date,
          total: d.total,
          cash: d.cash,
          card: d.card,
          talabat: d.talabat,
        })),
      },
      equity: equityRes.data?.running_total ?? 0,
      adcbBalance: bankRes.data?.balance ?? 0,
      inventory: {
        outOfStock: outCount,
        lowStock: lowCount,
        alerts: inventoryAlerts.map((i) => ({
          name: i.name,
          type: i.type,
          qty: i.qty,
          status: i.status,
        })),
      },
      recentActivity: (recentActivityRes.data || []).map((a) => ({
        id: a.id,
        action: a.action,
        table: a.table_name,
        time: a.created_at,
        staff: (a.staff as unknown as { name: string })?.name || "System",
      })),
    };

    return NextResponse.json(dashboard);
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
