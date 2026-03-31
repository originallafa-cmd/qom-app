import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

// Generate smart inventory reminders based on usage patterns
export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const supabase = await createServiceSupabase();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const reminders: { type: string; severity: string; message: string; item?: string }[] = [];

    // 1. Out of stock items
    const { data: outItems } = await supabase
      .from("inventory_items")
      .select("name, type")
      .eq("status", "out");

    (outItems || []).forEach(item => {
      reminders.push({
        type: "out_of_stock",
        severity: "critical",
        message: `${item.name} is OUT OF STOCK — needs restocking or production`,
        item: item.name,
      });
    });

    // 2. Low stock items
    const { data: lowItems } = await supabase
      .from("inventory_items")
      .select("name, type, qty, unit, reorder_at")
      .eq("status", "low");

    (lowItems || []).forEach(item => {
      reminders.push({
        type: "low_stock",
        severity: "warning",
        message: `${item.name} is low — ${item.qty} ${item.unit} left (reorder at ${item.reorder_at})`,
        item: item.name,
      });
    });

    // 3. Items not counted recently (last count > 3 days for kitchen, > 7 days for grocery/packaging)
    const { data: allItems } = await supabase
      .from("inventory_items")
      .select("id, name, type");

    for (const item of (allItems || [])) {
      const { data: lastCount } = await supabase
        .from("inventory_counts")
        .select("counted_at")
        .eq("item_id", item.id)
        .order("counted_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastCount) {
        // Never counted
        reminders.push({
          type: "never_counted",
          severity: "info",
          message: `${item.name} has never been counted — please do a count`,
          item: item.name,
        });
        continue;
      }

      const daysSince = Math.floor((today.getTime() - new Date(lastCount.counted_at).getTime()) / 86400000);
      const threshold = item.type === "kitchen" ? 3 : 7;

      if (daysSince >= threshold) {
        reminders.push({
          type: "count_overdue",
          severity: "warning",
          message: `${item.name} — last counted ${daysSince} days ago. Time for a recount.`,
          item: item.name,
        });
      }
    }

    // 4. No production logged today (kitchen items)
    const { data: todayProd } = await supabase
      .from("production_log")
      .select("id")
      .eq("date", todayStr)
      .limit(1);

    if (!todayProd || todayProd.length === 0) {
      reminders.push({
        type: "no_production",
        severity: "info",
        message: "No production logged today. Did you make anything?",
      });
    }

    // 5. Yesterday's sales not submitted
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdaySales } = await supabase
      .from("daily_sales")
      .select("id")
      .eq("date", yesterdayStr)
      .single();

    if (!yesterdaySales) {
      reminders.push({
        type: "missing_sales",
        severity: "warning",
        message: `Yesterday's sales (${yesterdayStr}) not submitted yet`,
      });
    }

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    reminders.sort((a, b) => (order[a.severity as keyof typeof order] || 2) - (order[b.severity as keyof typeof order] || 2));

    return NextResponse.json({
      date: todayStr,
      total: reminders.length,
      critical: reminders.filter(r => r.severity === "critical").length,
      warning: reminders.filter(r => r.severity === "warning").length,
      info: reminders.filter(r => r.severity === "info").length,
      reminders,
    });
  } catch (err) {
    console.error("Reminders error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
