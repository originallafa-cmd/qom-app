import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

function formatAED(n: number): string {
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text.toLowerCase().trim();
    const supabase = await createServiceSupabase();

    // --- SALES TODAY ---
    if (text.includes("sales today") || text.includes("مبيعات اليوم") || text === "/today") {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("daily_sales").select("*").eq("date", today).single();

      if (!data) {
        await sendMessage(chatId, "📊 No sales entry for today yet.");
      } else {
        await sendMessage(chatId,
          `📊 <b>Sales Today (${today})</b>\n\n` +
          `💵 Cash: ${formatAED(data.cash)}\n` +
          `💳 Card: ${formatAED(data.card)}\n` +
          `🛵 Talabat: ${formatAED(data.talabat)}\n` +
          `━━━━━━━━━━━━\n` +
          `📈 Total: <b>${formatAED(data.total)}</b>\n` +
          `📉 Expenses: ${formatAED(data.expenses)}\n` +
          `✅ Net: <b>${formatAED(data.net)}</b>`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // --- SALES THIS WEEK ---
    if (text.includes("sales this week") || text.includes("week") || text === "/week") {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const fromStr = weekStart.toISOString().split("T")[0];
      const toStr = today.toISOString().split("T")[0];

      const { data } = await supabase.from("daily_sales").select("*").gte("date", fromStr).lte("date", toStr).order("date");
      const sales = data || [];
      const total = sales.reduce((s, r) => s + (r.total || 0), 0);
      const expenses = sales.reduce((s, r) => s + (r.expenses || 0), 0);

      await sendMessage(chatId,
        `📊 <b>This Week (${fromStr} → ${toStr})</b>\n\n` +
        `📅 Days: ${sales.length}\n` +
        `📈 Total: <b>${formatAED(total)}</b>\n` +
        `📉 Expenses: ${formatAED(expenses)}\n` +
        `✅ Net: <b>${formatAED(total - expenses)}</b>\n` +
        `📊 Avg/day: ${formatAED(sales.length > 0 ? total / sales.length : 0)}`
      );
      return NextResponse.json({ ok: true });
    }

    // --- SALES MONTH ---
    if (text.includes("sales march") || text.includes("sales feb") || text.includes("month") || text === "/month") {
      const month = new Date().toISOString().slice(0, 7);
      const { data } = await supabase.from("daily_sales").select("*").gte("date", month + "-01").lte("date", month + "-31").order("date");
      const sales = data || [];
      const total = sales.reduce((s, r) => s + (r.total || 0), 0);
      const cash = sales.reduce((s, r) => s + (r.cash || 0), 0);
      const card = sales.reduce((s, r) => s + (r.card || 0), 0);
      const talabat = sales.reduce((s, r) => s + (r.talabat || 0), 0);
      const expenses = sales.reduce((s, r) => s + (r.expenses || 0), 0);

      await sendMessage(chatId,
        `📊 <b>Month: ${month}</b>\n\n` +
        `📅 Days: ${sales.length}\n` +
        `📈 Total: <b>${formatAED(total)}</b>\n` +
        `📊 Avg/day: ${formatAED(sales.length > 0 ? total / sales.length : 0)}\n\n` +
        `💵 Cash: ${formatAED(cash)} (${total > 0 ? ((cash/total)*100).toFixed(0) : 0}%)\n` +
        `💳 Card: ${formatAED(card)} (${total > 0 ? ((card/total)*100).toFixed(0) : 0}%)\n` +
        `🛵 Talabat: ${formatAED(talabat)} (${total > 0 ? ((talabat/total)*100).toFixed(0) : 0}%)\n\n` +
        `📉 Expenses: ${formatAED(expenses)}\n` +
        `✅ Net: <b>${formatAED(total - expenses)}</b>`
      );
      return NextResponse.json({ ok: true });
    }

    // --- INVENTORY ---
    if (text.includes("inventory") || text.includes("المخزون") || text === "/inventory") {
      const { data } = await supabase.from("inventory_items").select("name, type, qty, unit, status").in("status", ["out", "low"]).order("status");
      const items = data || [];

      if (items.length === 0) {
        await sendMessage(chatId, "✅ All inventory items are stocked!");
      } else {
        const outItems = items.filter((i) => i.status === "out");
        const lowItems = items.filter((i) => i.status === "low");

        let msg = `📦 <b>Inventory Alerts</b>\n\n`;
        if (outItems.length > 0) {
          msg += `🔴 <b>OUT OF STOCK (${outItems.length}):</b>\n`;
          outItems.forEach((i) => { msg += `  • ${i.name} (${i.type})\n`; });
          msg += "\n";
        }
        if (lowItems.length > 0) {
          msg += `🟡 <b>LOW STOCK (${lowItems.length}):</b>\n`;
          lowItems.forEach((i) => { msg += `  • ${i.name}: ${i.qty} ${i.unit}\n`; });
        }
        await sendMessage(chatId, msg);
      }
      return NextResponse.json({ ok: true });
    }

    // --- ADCB / BANK ---
    if (text.includes("adcb") || text.includes("البنك") || text.includes("bank") || text === "/bank") {
      const { data } = await supabase.from("bank_transactions").select("balance, date").order("date", { ascending: false }).limit(1).single();
      const balance = data?.balance ?? 0;
      await sendMessage(chatId,
        `🏦 <b>ADCB Balance</b>\n\n` +
        `💰 ${formatAED(balance)} AED\n` +
        `📅 As of: ${data?.date || "N/A"}`
      );
      return NextResponse.json({ ok: true });
    }

    // --- EQUITY ---
    if (text.includes("equity") || text === "/equity") {
      const { data } = await supabase.from("equity_ledger").select("running_total, date").order("created_at", { ascending: false }).limit(1).single();
      const balance = data?.running_total ?? 0;
      await sendMessage(chatId,
        `⚖️ <b>Equity Status</b>\n\n` +
        `💰 Balance: <b>${formatAED(balance)}</b>\n` +
        `👤 Ahmed's 50%: ${formatAED(balance * 0.5)}\n` +
        `📅 As of: ${data?.date || "N/A"}\n` +
        `${balance === 0 ? "✅ ZERO — All settled" : "⚠️ Outstanding balance"}`
      );
      return NextResponse.json({ ok: true });
    }

    // --- ALERTS ---
    if (text.includes("alerts") || text === "/alerts") {
      const [invRes, notifRes] = await Promise.all([
        supabase.from("inventory_items").select("name, status").in("status", ["out", "low"]),
        supabase.from("notifications").select("message, severity").eq("read", false).order("created_at", { ascending: false }).limit(5),
      ]);

      const inv = invRes.data || [];
      const notifs = notifRes.data || [];

      let msg = `🔔 <b>Active Alerts</b>\n\n`;
      msg += `📦 Inventory: ${inv.filter((i) => i.status === "out").length} out, ${inv.filter((i) => i.status === "low").length} low\n\n`;

      if (notifs.length > 0) {
        msg += `📋 Recent:\n`;
        notifs.forEach((n) => {
          const icon = n.severity === "critical" ? "🔴" : n.severity === "warning" ? "🟡" : "🔵";
          msg += `${icon} ${n.message.slice(0, 100)}\n`;
        });
      } else {
        msg += "✅ No unread notifications";
      }
      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // --- HELP / START ---
    if (text === "/start" || text === "/help" || text === "help") {
      await sendMessage(chatId,
        `👑 <b>Queen of Mahshi Bot</b>\n\n` +
        `Commands:\n` +
        `📊 <b>sales today</b> — Today's sales\n` +
        `📊 <b>sales this week</b> — Weekly summary\n` +
        `📊 <b>month</b> — Monthly summary\n` +
        `📦 <b>inventory</b> — Low/out stock alerts\n` +
        `🏦 <b>adcb</b> — Bank balance\n` +
        `⚖️ <b>equity</b> — Equity status\n` +
        `🔔 <b>alerts</b> — All active alerts\n\n` +
        `Also works in Arabic: مبيعات اليوم، المخزون، البنك`
      );
      return NextResponse.json({ ok: true });
    }

    // --- DEFAULT ---
    await sendMessage(chatId, "❓ I didn't understand that. Send /help to see available commands.");
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Telegram bot error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
