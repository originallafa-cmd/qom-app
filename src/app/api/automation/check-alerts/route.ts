import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

// Check all alert conditions and create notifications
export async function POST() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const supabase = await createServiceSupabase();
    const created: string[] = [];

    // 1. Inventory alerts
    const { data: invAlerts } = await supabase
      .from("inventory_items")
      .select("id, name, type, qty, status")
      .in("status", ["out", "low"]);

    const outItems = (invAlerts || []).filter((i) => i.status === "out");
    const lowItems = (invAlerts || []).filter((i) => i.status === "low");

    if (outItems.length > 0) {
      await supabase.from("notifications").insert({
        type: "inventory",
        severity: "critical",
        message: `${outItems.length} items OUT OF STOCK: ${outItems.map((i) => `${i.name} (${i.type})`).join(", ")}`,
        data: { items: outItems },
      });
      created.push(`inventory_out: ${outItems.length} items`);
    }

    if (lowItems.length > 0) {
      await supabase.from("notifications").insert({
        type: "inventory",
        severity: "warning",
        message: `${lowItems.length} items LOW STOCK: ${lowItems.map((i) => `${i.name}: ${i.qty}`).join(", ")}`,
        data: { items: lowItems },
      });
      created.push(`inventory_low: ${lowItems.length} items`);
    }

    // 2. Bank balance alert
    const { data: bankData } = await supabase
      .from("bank_transactions")
      .select("balance")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    const balance = bankData?.balance ?? 0;
    if (balance > 0 && balance < 5000) {
      await supabase.from("notifications").insert({
        type: "bank",
        severity: "warning",
        message: `ADCB balance low: ${balance.toFixed(2)} AED (threshold: 5,000)`,
        data: { balance },
      });
      created.push(`bank_low: ${balance}`);
    }

    // 3. Check for missing daily sales (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdaySales } = await supabase
      .from("daily_sales")
      .select("id")
      .eq("date", yesterdayStr)
      .single();

    if (!yesterdaySales) {
      await supabase.from("notifications").insert({
        type: "sales",
        severity: "warning",
        message: `No sales entry for ${yesterdayStr} — staff may have forgotten to submit`,
        data: { date: yesterdayStr },
      });
      created.push(`missing_sales: ${yesterdayStr}`);
    }

    return NextResponse.json({ success: true, alertsCreated: created });
  } catch (err) {
    console.error("Check alerts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
