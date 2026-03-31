import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { APP_VERSION } from "@/lib/version";

const VAULT = "D:\\vault";
const BRAIN = "D:\\vault\\01 - Queen of Mahshi\\Brain";
const DAILY = "D:\\vault\\01 - Queen of Mahshi\\Daily";

function aed(n: number) { return (n || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const mode = (body as Record<string, string>).mode || "full"; // full | live | daily | ai-log

    const supabase = await createServiceSupabase();
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);
    const files: string[] = [];

    await mkdir(BRAIN, { recursive: true });
    await mkdir(DAILY, { recursive: true });
    await mkdir(VAULT, { recursive: true });

    // ─── LIVE STATE (always updated) ─────────────────
    if (mode === "full" || mode === "live") {
      const [salesRes, invRes, equityRes, bankRes, alertsRes, recentRes] = await Promise.all([
        supabase.from("daily_sales").select("*").order("date", { ascending: false }).limit(7),
        supabase.from("inventory_items").select("name, type, qty, unit, status").order("type, name"),
        supabase.from("equity_ledger").select("running_total, date").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("bank_transactions").select("balance, date").order("date", { ascending: false }).limit(1).single(),
        supabase.from("inventory_items").select("name, type, qty, status").in("status", ["out", "low"]),
        supabase.from("audit_log").select("action, table_name, created_at, staff:user_id(name)").order("created_at", { ascending: false }).limit(10),
      ]);

      const sales = salesRes.data || [];
      const alerts = alertsRes.data || [];
      const outItems = alerts.filter(a => a.status === "out");
      const lowItems = alerts.filter(a => a.status === "low");
      const todaySales = sales.find(s => s.date === today);
      const monthSales = sales.filter(s => s.date.startsWith(currentMonth));
      const monthTotal = monthSales.reduce((s, r) => s + (r.total || 0), 0);

      const liveState = `---
updated: ${new Date().toISOString()}
version: ${APP_VERSION}
---

# QoM Live State
> Auto-generated. Read this FIRST in every Claude session.

## Today (${today})
${todaySales
  ? `- Total: **${aed(todaySales.total)}** | Cash ${aed(todaySales.cash)} | Card ${aed(todaySales.card)} | Talabat ${aed(todaySales.talabat)}
- Expenses: ${aed(todaySales.expenses)} | Net: **${aed(todaySales.net)}**`
  : "- No sales entry yet"}

## Month (${currentMonth})
- Total: **${aed(monthTotal)}** | Days: ${monthSales.length} | Avg: ${aed(monthSales.length > 0 ? monthTotal / monthSales.length : 0)}/day

## Last 7 Days
${sales.map(s => `| ${s.date} | ${aed(s.total)} | Cash ${s.cash.toFixed(0)} Card ${s.card.toFixed(0)} Tal ${s.talabat.toFixed(0)} |`).join("\n")}

## Financial
- ADCB Balance: **${aed(bankRes.data?.balance ?? 0)}** (${bankRes.data?.date || "N/A"})
- Equity: **${aed(equityRes.data?.running_total ?? 0)}** | Ahmed's 50%: ${aed((equityRes.data?.running_total ?? 0) * 0.5)}

## Inventory Alerts
${outItems.length === 0 && lowItems.length === 0 ? "✅ All stocked" : ""}
${outItems.length > 0 ? `🔴 **OUT (${outItems.length}):** ${outItems.map(i => i.name).join(", ")}` : ""}
${lowItems.length > 0 ? `🟡 **LOW (${lowItems.length}):** ${lowItems.map(i => `${i.name}(${i.qty})`).join(", ")}` : ""}

## Inventory Summary
- Grocery: ${(invRes.data || []).filter(i => i.type === "grocery").length} items
- Packaging: ${(invRes.data || []).filter(i => i.type === "packaging").length} items
- Kitchen: ${(invRes.data || []).filter(i => i.type === "kitchen").length} items

## Recent Activity
${(recentRes.data || []).slice(0, 5).map(a => {
  const staff = (a.staff as unknown as { name: string })?.name || "System";
  const time = new Date(a.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return `- ${time} | ${staff} | ${a.action} ${a.table_name}`;
}).join("\n")}
`;

      await writeFile(join(BRAIN, "QoM_Live_State.md"), liveState, "utf-8");
      files.push("Brain/QoM_Live_State.md");
    }

    // ─── DAILY FILE ──────────────────────────────────
    if (mode === "full" || mode === "daily") {
      const { data: todayData } = await supabase.from("daily_sales").select("*").eq("date", today).single();
      const { data: todayExpenses } = await supabase.from("expense_items").select("*").eq("daily_sales_id", todayData?.id || "none");
      const { data: todayProduction } = await supabase.from("production_log").select("*").eq("date", today);
      const { data: todayActivity } = await supabase.from("audit_log")
        .select("action, table_name, created_at, new_data, staff:user_id(name)")
        .gte("created_at", today + "T00:00:00")
        .order("created_at", { ascending: false });

      const daily = `---
date: ${today}
type: daily-summary
---

# ${today} — Daily Summary

## Sales
${todayData
  ? `| Channel | Amount |
|---------|--------|
| Cash | ${aed(todayData.cash)} |
| Card | ${aed(todayData.card)} |
| Talabat | ${aed(todayData.talabat)} |
| **Total** | **${aed(todayData.total)}** |
| Expenses | -${aed(todayData.expenses)} |
| **Net** | **${aed(todayData.net)}** |`
  : "No sales entered yet."}

## Expenses
${(todayExpenses || []).length > 0
  ? (todayExpenses || []).map(e => `- ${e.description}: ${aed(e.amount)} (${e.category})`).join("\n")
  : "None logged."}

## Production
${(todayProduction || []).length > 0
  ? (todayProduction || []).map(p => `- ${p.item}: ${p.quantity} ${p.unit}`).join("\n")
  : "None logged."}

## Activity Log
${(todayActivity || []).map(a => {
  const staff = (a.staff as unknown as { name: string })?.name || "System";
  const time = new Date(a.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `- ${time} ${staff}: ${a.action} ${a.table_name}`;
}).join("\n") || "No activity."}
`;

      await writeFile(join(DAILY, `${today}.md`), daily, "utf-8");
      files.push(`Daily/${today}.md`);
    }

    // ─── AI MEMORY (persistent learning) ─────────────
    if (mode === "full") {
      // Read existing memory or create new
      let existingMemory = "";
      try {
        const { readFile } = await import("fs/promises");
        existingMemory = await readFile(join(BRAIN, "QoM_AI_Memory.md"), "utf-8");
      } catch {
        existingMemory = `---
created: ${today}
type: ai-memory
---

# QoM AI Memory
> Claude's persistent learning. Updated over time.

## Learned Patterns
(None yet — will accumulate as AI processes data)

## Recipe Map
(Not yet configured — staff will teach by uploading recipe photos)

## Usage Adjustments
(None yet — will learn from actual vs expected inventory depletion)

## Staff Notes
(Observations about staff habits, common issues, etc.)
`;
      }

      await writeFile(join(BRAIN, "QoM_AI_Memory.md"), existingMemory, "utf-8");
      files.push("Brain/QoM_AI_Memory.md");
    }

    // ─── AI LOG (recent interactions) ────────────────
    if (mode === "full" || mode === "ai-log") {
      let existingLog = "";
      try {
        const { readFile } = await import("fs/promises");
        existingLog = await readFile(join(BRAIN, "QoM_AI_Log.md"), "utf-8");
      } catch {
        existingLog = `---
type: ai-log
---

# QoM AI Interaction Log
> Recent AI processing events. Newest first.

`;
      }

      await writeFile(join(BRAIN, "QoM_AI_Log.md"), existingLog, "utf-8");
      files.push("Brain/QoM_AI_Log.md");
    }

    // ─── FULL EXPORT (JSON backups) ──────────────────
    if (mode === "full") {
      const [salesRes, invRes, equityRes, bankRes] = await Promise.all([
        supabase.from("daily_sales").select("*").order("date", { ascending: false }).limit(90),
        supabase.from("inventory_items").select("*").order("type, name"),
        supabase.from("equity_ledger").select("*").order("created_at", { ascending: false }),
        supabase.from("bank_transactions").select("*").order("date", { ascending: false }).limit(50),
      ]);

      await writeFile(join(VAULT, `QoM_Full_Export_${today}.json`), JSON.stringify({
        exported_at: new Date().toISOString(),
        version: APP_VERSION,
        sales: salesRes.data || [],
        inventory: invRes.data || [],
        equity: equityRes.data || [],
        bank: bankRes.data || [],
      }, null, 2), "utf-8");
      files.push(`QoM_Full_Export_${today}.json`);

      // Session memo
      await writeFile(join(VAULT, `QoM_SESSION_MEMO_${today}.md`),
        `# QoM Session Memo — ${today}\nApp v${APP_VERSION}\nVault synced at ${new Date().toLocaleTimeString("en-GB")}\nFiles: ${files.join(", ")}\n`,
        "utf-8"
      );
      files.push(`QoM_SESSION_MEMO_${today}.md`);

      // Sync cloud notes to local vault
      const { data: cloudNotes } = await supabase
        .from("settings")
        .select("key, value")
        .like("key", "vault_note:%");

      for (const note of (cloudNotes || [])) {
        const notePath = note.key.replace("vault_note:", "");
        const fullPath = join(VAULT, "notes", notePath);
        const dir = fullPath.substring(0, fullPath.lastIndexOf("\\") > 0 ? fullPath.lastIndexOf("\\") : fullPath.lastIndexOf("/"));
        await mkdir(dir, { recursive: true });
        await writeFile(fullPath, JSON.parse(note.value), "utf-8");
        files.push(`notes/${notePath}`);
      }
    }

    return NextResponse.json({ success: true, mode, files });
  } catch (err) {
    console.error("Vault sync error:", err);
    return NextResponse.json({ error: "Vault sync failed" }, { status: 500 });
  }
}
