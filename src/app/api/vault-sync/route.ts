import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAdmin, unauthorizedResponse } from "@/lib/api-auth";

const VAULT_PATH = "D:\\vault";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return unauthorizedResponse();
    const supabase = await createServiceSupabase();
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);

    // Fetch all data
    const [salesRes, inventoryRes, equityRes, bankRes, settingsRes, alertsRes] = await Promise.all([
      supabase.from("daily_sales").select("*").order("date", { ascending: false }).limit(90),
      supabase.from("inventory_items").select("*").order("type, name"),
      supabase.from("equity_ledger").select("*").order("created_at", { ascending: false }),
      supabase.from("bank_transactions").select("*").order("date", { ascending: false }).limit(50),
      supabase.from("settings").select("*"),
      supabase.from("inventory_items").select("name, type, qty, status").in("status", ["out", "low"]),
    ]);

    const sales = salesRes.data || [];
    const inventory = inventoryRes.data || [];
    const equity = equityRes.data || [];
    const bank = bankRes.data || [];
    const alerts = alertsRes.data || [];

    // Calculate month stats
    const monthSales = sales.filter((s) => s.date.startsWith(currentMonth));
    const monthRevenue = monthSales.reduce((s, r) => s + (r.total || 0), 0);
    const monthDays = monthSales.length;
    const avgDaily = monthDays > 0 ? monthRevenue / monthDays : 0;

    const adcbBalance = bank[0]?.balance ?? 0;
    const equityBalance = equity[0]?.running_total ?? 0;

    // Generate session memo
    const memo = `# QoM SESSION MEMO — Updated ${today}
## For: Next Claude instance. Read this FIRST.

---

## WHO
- **Mohamed** — co-owner Queen of Mahshi (ملكة المحشي), Bani Yas West, Abu Dhabi
- **Ahmed** — 50/50 partner | Business: ORIGINAL LAFA CAFETERIA LLC SPC
- Staff: Cisene (head), Rose Catherine, Malimie, Mae Ann, Reyana

## CURRENT STATUS

### EQUITY: ${equityBalance === 0 ? "ZERO ✅" : formatNum(equityBalance)} — Reset Mar 28, 2026
${equity.slice(0, 5).map((e) => `- ${e.date}: ${e.type} ${formatNum(e.amount)} → running: ${formatNum(e.running_total)}`).join("\n")}

### ADCB: ${formatNum(adcbBalance)}
${bank.slice(0, 5).map((t) => `- ${t.date}: ${t.description} | D:${formatNum(t.debit)} C:${formatNum(t.credit)} | Bal:${formatNum(t.balance)}`).join("\n")}

### ${currentMonth.toUpperCase()} SALES (${monthDays} days)
\`\`\`
TOTAL: ${formatNum(monthRevenue)} | Avg: ${formatNum(avgDaily)}/day
${monthSales.slice(0, 10).map((s) => `${s.date}: ${formatNum(s.total)}`).join(" | ")}
\`\`\`

### INVENTORY ALERTS
${alerts.length === 0 ? "✅ All items stocked" : alerts.map((a) => `- **${a.status === "out" ? "🔴 OUT" : "🟡 LOW"}:** ${a.name} (${a.type}) — ${a.qty} left`).join("\n")}

---

## CRITICAL REMINDERS
1. **EQUITY = ${equityBalance === 0 ? "ZERO" : formatNum(equityBalance)}.** Reset Mar 28.
2. **ADCB: ${formatNum(adcbBalance)}**
3. **App running at:** qom-app.vercel.app (or localhost:3000)
4. **MCP endpoint:** /api/mcp
`;

    // Write files
    await mkdir(VAULT_PATH, { recursive: true });
    await writeFile(join(VAULT_PATH, `QoM_SESSION_MEMO_${today}.md`), memo, "utf-8");

    // Sales JSON
    await writeFile(
      join(VAULT_PATH, `QoM_Sales_${currentMonth}.json`),
      JSON.stringify({ month: currentMonth, days: monthDays, sales: monthSales }, null, 2),
      "utf-8"
    );

    // Inventory JSON
    await writeFile(
      join(VAULT_PATH, `QoM_Inventory_${today}.json`),
      JSON.stringify({ date: today, items: inventory, alerts }, null, 2),
      "utf-8"
    );

    // Full export
    await writeFile(
      join(VAULT_PATH, `QoM_Full_Export_${today}.json`),
      JSON.stringify({
        exported_at: new Date().toISOString(),
        sales: sales.slice(0, 90),
        inventory,
        equity,
        bank: bank.slice(0, 50),
        alerts,
      }, null, 2),
      "utf-8"
    );

    return NextResponse.json({
      success: true,
      files: [
        `QoM_SESSION_MEMO_${today}.md`,
        `QoM_Sales_${currentMonth}.json`,
        `QoM_Inventory_${today}.json`,
        `QoM_Full_Export_${today}.json`,
      ],
    });
  } catch (err) {
    console.error("Vault sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
