import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

// MCP Server — JSON-RPC style endpoint for Claude Code / Claude.ai
// Auth via API key in header

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function verifyApiKey(request: Request): boolean {
  const key = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.MCP_API_KEY;
  if (!expected) return true; // No key set = open (dev mode)
  return key === expected;
}

export async function POST(request: Request) {
  if (!verifyApiKey(request)) return unauthorized();

  try {
    const { tool, params } = await request.json();
    const supabase = await createServiceSupabase();

    switch (tool) {
      case "get_dashboard_data": {
        const today = new Date().toISOString().split("T")[0];
        const monthStart = today.slice(0, 7) + "-01";

        const [todayRes, monthRes, alertsRes, equityRes, bankRes] = await Promise.all([
          supabase.from("daily_sales").select("*").eq("date", today).single(),
          supabase.from("daily_sales").select("*").gte("date", monthStart).lte("date", today),
          supabase.from("inventory_items").select("name, type, qty, status").in("status", ["out", "low"]),
          supabase.from("equity_ledger").select("running_total").order("created_at", { ascending: false }).limit(1).single(),
          supabase.from("bank_transactions").select("balance").order("date", { ascending: false }).limit(1).single(),
        ]);

        return NextResponse.json({
          today: todayRes.data || { cash: 0, card: 0, talabat: 0, total: 0, expenses: 0, net: 0 },
          monthSales: monthRes.data || [],
          inventoryAlerts: alertsRes.data || [],
          equity: equityRes.data?.running_total ?? 0,
          adcbBalance: bankRes.data?.balance ?? 0,
        });
      }

      case "add_daily_sales": {
        const { date, cash, card, talabat, expenses, notes, staff } = params;
        const totalExpenses = expenses || 0;
        const { data, error } = await supabase.from("daily_sales").insert({
          date, cash: cash || 0, card: card || 0, talabat: talabat || 0,
          expenses: totalExpenses, notes: notes || null, opening_cash: 0, pt_cash: 0,
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case "get_daily_sales": {
        const { from, to } = params || {};
        let q = supabase.from("daily_sales").select("*").order("date", { ascending: false });
        if (from) q = q.gte("date", from);
        if (to) q = q.lte("date", to);
        const { data } = await q.limit(60);
        return NextResponse.json(data || []);
      }

      case "get_monthly_summary": {
        const { month } = params;
        const start = month + "-01";
        const [y, m] = month.split("-").map(Number);
        const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
        const { data } = await supabase.from("daily_sales").select("*").gte("date", start).lte("date", end).order("date");
        const sales = data || [];
        const total = sales.reduce((s, r) => s + (r.total || 0), 0);
        return NextResponse.json({
          month, days: sales.length, totalRevenue: total,
          avgDaily: sales.length > 0 ? total / sales.length : 0,
          cash: sales.reduce((s, r) => s + (r.cash || 0), 0),
          card: sales.reduce((s, r) => s + (r.card || 0), 0),
          talabat: sales.reduce((s, r) => s + (r.talabat || 0), 0),
          expenses: sales.reduce((s, r) => s + (r.expenses || 0), 0),
          dailyData: sales,
        });
      }

      case "update_inventory": {
        const { item_id, qty } = params;
        await supabase.from("inventory_items").update({ qty }).eq("id", item_id);
        await supabase.from("inventory_counts").insert({ item_id, qty });
        return NextResponse.json({ success: true });
      }

      case "get_inventory_alerts": {
        const { data } = await supabase.from("inventory_items").select("*").in("status", ["out", "low"]);
        return NextResponse.json(data || []);
      }

      case "get_inventory_full": {
        const { type } = params || {};
        let q = supabase.from("inventory_items").select("*").order("name");
        if (type) q = q.eq("type", type);
        const { data } = await q;
        return NextResponse.json(data || []);
      }

      case "add_expense": {
        const { date, description, amount, category } = params;
        const month = (date || new Date().toISOString().split("T")[0]).slice(0, 7);
        const { data, error } = await supabase.from("expenses_monthly").insert({
          month, item: description, amount, category: category || "other",
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case "get_expenses": {
        const { month } = params;
        const { data } = await supabase.from("expenses_monthly").select("*").eq("month", month);
        return NextResponse.json(data || []);
      }

      case "update_equity": {
        const { type, amount, description } = params;
        const { data: latest } = await supabase.from("equity_ledger").select("running_total").order("created_at", { ascending: false }).limit(1).single();
        const prev = latest?.running_total ?? 0;
        const newTotal = type === "personal_from_biz" ? prev + amount : type === "personal_into_biz" ? prev - amount : amount;
        const { data, error } = await supabase.from("equity_ledger").insert({
          type, amount, description, running_total: newTotal,
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case "get_equity": {
        const { data } = await supabase.from("equity_ledger").select("*").order("created_at", { ascending: false });
        return NextResponse.json({ entries: data || [], currentBalance: data?.[0]?.running_total ?? 0 });
      }

      case "add_bank_transaction": {
        const { date, description, amount, type, biz_or_personal } = params;
        const { data, error } = await supabase.from("bank_transactions").insert({
          date, description,
          debit: type === "debit" ? amount : 0,
          credit: type === "credit" ? amount : 0,
          biz_or_personal: biz_or_personal || "biz",
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case "get_bank_balance": {
        const { data } = await supabase.from("bank_transactions").select("balance").order("date", { ascending: false }).limit(1).single();
        return NextResponse.json({ balance: data?.balance ?? 0 });
      }

      case "get_bank_transactions": {
        const { from, to } = params || {};
        let q = supabase.from("bank_transactions").select("*").order("date", { ascending: false });
        if (from) q = q.gte("date", from);
        if (to) q = q.lte("date", to);
        const { data } = await q.limit(200);
        return NextResponse.json(data || []);
      }

      case "get_analytics": {
        const { from, to } = params || {};
        let q = supabase.from("daily_sales").select("date, cash, card, talabat, total, expenses, net").order("date");
        if (from) q = q.gte("date", from);
        if (to) q = q.lte("date", to);
        const { data } = await q;
        const sales = data || [];
        const totalRev = sales.reduce((s, r) => s + (r.total || 0), 0);
        return NextResponse.json({
          totalRevenue: totalRev, days: sales.length,
          avgDaily: sales.length > 0 ? totalRev / sales.length : 0,
          dailyData: sales,
        });
      }

      case "add_production_log": {
        const { date, item, quantity, made_by } = params;
        const { data, error } = await supabase.from("production_log").insert({
          date: date || new Date().toISOString().split("T")[0], item, quantity, unit: "pcs",
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case "get_production_log": {
        const { from, to } = params || {};
        let q = supabase.from("production_log").select("*").order("date", { ascending: false });
        if (from) q = q.gte("date", from);
        if (to) q = q.lte("date", to);
        const { data } = await q.limit(100);
        return NextResponse.json(data || []);
      }

      case "get_alerts": {
        const [invRes, notifRes] = await Promise.all([
          supabase.from("inventory_items").select("name, type, qty, status").in("status", ["out", "low"]),
          supabase.from("notifications").select("*").eq("read", false).order("created_at", { ascending: false }).limit(20),
        ]);
        return NextResponse.json({
          inventoryAlerts: invRes.data || [],
          notifications: notifRes.data || [],
        });
      }

      case "list_tools": {
        return NextResponse.json({
          tools: [
            "get_dashboard_data", "add_daily_sales", "get_daily_sales", "get_monthly_summary",
            "update_inventory", "get_inventory_alerts", "get_inventory_full",
            "add_expense", "get_expenses", "update_equity", "get_equity",
            "add_bank_transaction", "get_bank_balance", "get_bank_transactions",
            "get_analytics", "add_production_log", "get_production_log", "get_alerts",
          ],
        });
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err) {
    console.error("MCP error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET endpoint for health check / tool listing
export async function GET(request: Request) {
  if (!verifyApiKey(request)) return unauthorized();
  return NextResponse.json({
    name: "Queen of Mahshi MCP Server",
    version: "1.0.0",
    tools: [
      "get_dashboard_data", "add_daily_sales", "get_daily_sales", "get_monthly_summary",
      "update_inventory", "get_inventory_alerts", "get_inventory_full",
      "add_expense", "get_expenses", "update_equity", "get_equity",
      "add_bank_transaction", "get_bank_balance", "get_bank_transactions",
      "get_analytics", "add_production_log", "get_production_log", "get_alerts",
    ],
  });
}
