import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const supabase = await createServiceSupabase();

    // Fetch daily sales
    let salesQuery = supabase
      .from("daily_sales")
      .select("date, cash, card, talabat, total, expenses, net")
      .order("date");
    if (from) salesQuery = salesQuery.gte("date", from);
    if (to) salesQuery = salesQuery.lte("date", to);

    // Fetch orders for hourly analysis
    let ordersQuery = supabase
      .from("orders_history")
      .select("datetime, amount, payment_type")
      .order("datetime");
    if (from) ordersQuery = ordersQuery.gte("datetime", `${from}T00:00:00`);
    if (to) ordersQuery = ordersQuery.lte("datetime", `${to}T23:59:59`);

    const [salesRes, ordersRes] = await Promise.all([salesQuery, ordersQuery]);
    const sales = salesRes.data || [];
    const orders = ordersRes.data || [];

    // Monthly trends
    const monthlyMap: Record<string, { revenue: number; days: number; cash: number; card: number; talabat: number; expenses: number }> = {};
    sales.forEach((s) => {
      const m = s.date.slice(0, 7);
      if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, days: 0, cash: 0, card: 0, talabat: 0, expenses: 0 };
      monthlyMap[m].revenue += s.total || 0;
      monthlyMap[m].days++;
      monthlyMap[m].cash += s.cash || 0;
      monthlyMap[m].card += s.card || 0;
      monthlyMap[m].talabat += s.talabat || 0;
      monthlyMap[m].expenses += s.expenses || 0;
    });
    const monthlyTrends = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        revenue: d.revenue,
        avgDaily: d.revenue / (d.days || 1),
        days: d.days,
        cash: d.cash,
        card: d.card,
        talabat: d.talabat,
        expenses: d.expenses,
        net: d.revenue - d.expenses,
        cashPct: d.revenue > 0 ? (d.cash / d.revenue) * 100 : 0,
        cardPct: d.revenue > 0 ? (d.card / d.revenue) * 100 : 0,
        talabatPct: d.revenue > 0 ? (d.talabat / d.revenue) * 100 : 0,
      }));

    // Day of week analysis
    const dayMap: Record<number, { revenue: number; count: number }> = {};
    for (let i = 0; i < 7; i++) dayMap[i] = { revenue: 0, count: 0 };
    sales.forEach((s) => {
      const dow = new Date(s.date).getDay();
      dayMap[dow].revenue += s.total || 0;
      dayMap[dow].count++;
    });
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = Object.entries(dayMap)
      .map(([dow, d]) => ({
        day: dayNames[parseInt(dow)],
        dayNum: parseInt(dow),
        totalRevenue: d.revenue,
        avgRevenue: d.count > 0 ? d.revenue / d.count : 0,
        count: d.count,
      }))
      .sort((a, b) => b.avgRevenue - a.avgRevenue);

    // Hourly heatmap (from orders)
    const hourMap: Record<number, { revenue: number; count: number }> = {};
    for (let i = 0; i < 24; i++) hourMap[i] = { revenue: 0, count: 0 };
    orders.forEach((o) => {
      const hour = new Date(o.datetime).getHours();
      hourMap[hour].revenue += o.amount || 0;
      hourMap[hour].count++;
    });
    const hourlyHeatmap = Object.entries(hourMap).map(([hour, d]) => ({
      hour: parseInt(hour),
      label: `${parseInt(hour).toString().padStart(2, "0")}:00`,
      revenue: d.revenue,
      orders: d.count,
      avgOrder: d.count > 0 ? d.revenue / d.count : 0,
    }));

    // Channel analysis
    const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
    const totalCash = sales.reduce((s, r) => s + (r.cash || 0), 0);
    const totalCard = sales.reduce((s, r) => s + (r.card || 0), 0);
    const totalTalabat = sales.reduce((s, r) => s + (r.talabat || 0), 0);
    const channelAnalysis = {
      cash: { gross: totalCash, pct: totalRevenue > 0 ? (totalCash / totalRevenue) * 100 : 0, actual: totalCash, feePct: 0 },
      card: { gross: totalCard, pct: totalRevenue > 0 ? (totalCard / totalRevenue) * 100 : 0, actual: totalCard * 0.9774, feePct: 2.26 },
      talabat: { gross: totalTalabat, pct: totalRevenue > 0 ? (totalTalabat / totalRevenue) * 100 : 0, actual: totalTalabat * 0.717, feePct: 28.3 },
    };

    // Order value distribution (from orders)
    const brackets = [
      { label: "0-25", min: 0, max: 25 },
      { label: "25-50", min: 25, max: 50 },
      { label: "50-100", min: 50, max: 100 },
      { label: "100-150", min: 100, max: 150 },
      { label: "150-200", min: 150, max: 200 },
      { label: "200+", min: 200, max: Infinity },
    ];
    const orderDistribution = brackets.map((b) => {
      const matching = orders.filter((o) => o.amount >= b.min && o.amount < b.max);
      return {
        label: b.label,
        count: matching.length,
        revenue: matching.reduce((s, o) => s + o.amount, 0),
        pct: orders.length > 0 ? (matching.length / orders.length) * 100 : 0,
      };
    });

    // Summary stats
    const totalDays = sales.length;
    const avgDaily = totalDays > 0 ? totalRevenue / totalDays : 0;
    const totalOrders = orders.length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bestDay = sales.reduce((best, s) => (s.total > (best?.total || 0) ? s : best), sales[0]);
    const worstDay = sales.reduce((worst, s) => (s.total < (worst?.total || Infinity) ? s : worst), sales[0]);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalDays,
        avgDaily,
        totalOrders,
        aov,
        bestDay: bestDay ? { date: bestDay.date, total: bestDay.total } : null,
        worstDay: worstDay ? { date: worstDay.date, total: worstDay.total } : null,
      },
      monthlyTrends,
      dayOfWeek,
      hourlyHeatmap,
      channelAnalysis,
      orderDistribution,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
