// Queen of Mahshi Telegram Bot — Premium UX
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── Helpers ─────────────────────────────────────
function aed(n) { return (n || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function pct(part, total) { return total > 0 ? ((part / total) * 100).toFixed(0) : "0"; }
function bar(ratio, len = 10) {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}
function dateStr(d) { return (d || new Date()).toISOString().split("T")[0]; }
function monthStr(d) { return (d || new Date()).toISOString().slice(0, 7); }
function dayName(d) { return new Date(d).toLocaleDateString("en", { weekday: "short" }); }

async function send(chatId, text, keyboard) {
  const body = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (keyboard) body.reply_markup = JSON.stringify(keyboard);
  const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
  for (let i = 0; i < chunks.length; i++) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, text: chunks[i], ...(i < chunks.length - 1 ? { reply_markup: undefined } : {}) }),
    });
  }
}

async function answer(callbackId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function typing(chatId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// ─── Main Menu ───────────────────────────────────
const MAIN_MENU = {
  inline_keyboard: [
    [{ text: "📊 Today's Sales", callback_data: "sales_today" }, { text: "📅 This Week", callback_data: "sales_week" }],
    [{ text: "📆 This Month", callback_data: "sales_month" }, { text: "📈 Compare Months", callback_data: "compare" }],
    [{ text: "📦 Inventory", callback_data: "inventory" }, { text: "🔔 Alerts", callback_data: "alerts" }],
    [{ text: "🏦 ADCB Bank", callback_data: "bank" }, { text: "⚖️ Equity", callback_data: "equity" }],
    [{ text: "💰 P&L This Month", callback_data: "pnl" }, { text: "🍳 Production", callback_data: "production" }],
  ],
};

const BACK_BTN = { inline_keyboard: [[{ text: "◀️ Main Menu", callback_data: "menu" }]] };
const SALES_NAV = (current) => ({
  inline_keyboard: [
    [
      { text: "📊 Today", callback_data: "sales_today" },
      { text: "📅 Week", callback_data: "sales_week" },
      { text: "📆 Month", callback_data: "sales_month" },
    ],
    [{ text: "◀️ Main Menu", callback_data: "menu" }],
  ],
});
const INV_NAV = {
  inline_keyboard: [
    [
      { text: "🔴 Out of Stock", callback_data: "inv_out" },
      { text: "🟡 Low Stock", callback_data: "inv_low" },
    ],
    [
      { text: "🥬 Grocery", callback_data: "inv_grocery" },
      { text: "📦 Packaging", callback_data: "inv_packaging" },
      { text: "🍳 Kitchen", callback_data: "inv_kitchen" },
    ],
    [{ text: "◀️ Main Menu", callback_data: "menu" }],
  ],
};

// ─── Handlers ────────────────────────────────────

async function handleStart(chatId) {
  await send(chatId,
    `👑 <b>Queen of Mahshi</b>\n` +
    `<i>ملكة المحشي — Shop Assistant</i>\n\n` +
    `Welcome! Choose an option below:`,
    MAIN_MENU
  );
}

async function handleSalesToday(chatId) {
  const today = dateStr();
  const { data } = await supabase.from("daily_sales").select("*").eq("date", today).single();

  if (!data) {
    await send(chatId,
      `📊 <b>Today (${today})</b>\n\n` +
      `<i>No sales entry submitted yet.</i>\n` +
      `Staff haven't logged today's sales.`,
      SALES_NAV()
    );
    return;
  }

  const total = data.total || 0;
  const cashPct = pct(data.cash, total);
  const cardPct = pct(data.card, total);
  const talPct = pct(data.talabat, total);

  await send(chatId,
    `📊 <b>Today — ${dayName(today)} ${today}</b>\n\n` +
    `┌─────────────────────\n` +
    `│ 💵 Cash      <b>${aed(data.cash)}</b>  (${cashPct}%)\n` +
    `│ 💳 Card       <b>${aed(data.card)}</b>  (${cardPct}%)\n` +
    `│ 🛵 Talabat  <b>${aed(data.talabat)}</b>  (${talPct}%)\n` +
    `├─────────────────────\n` +
    `│ 📈 Total     <b>${aed(total)}</b>\n` +
    `│ 📉 Expenses  <b>-${aed(data.expenses)}</b>\n` +
    `│ ✅ Net        <b>${aed(data.net)}</b>\n` +
    `└─────────────────────\n\n` +
    `${bar(data.cash / total)} Cash ${cashPct}%\n` +
    `${bar(data.card / total)} Card ${cardPct}%\n` +
    `${bar(data.talabat / total)} Talabat ${talPct}%\n` +
    (data.notes ? `\n⚠️ <i>${data.notes}</i>` : ""),
    SALES_NAV()
  );
}

async function handleSalesWeek(chatId) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const from = dateStr(weekStart);
  const to = dateStr(today);

  const { data } = await supabase.from("daily_sales").select("*").gte("date", from).lte("date", to).order("date");
  const sales = data || [];

  if (sales.length === 0) {
    await send(chatId, `📅 <b>This Week</b>\n\n<i>No data yet.</i>`, SALES_NAV());
    return;
  }

  const total = sales.reduce((s, r) => s + (r.total || 0), 0);
  const expenses = sales.reduce((s, r) => s + (r.expenses || 0), 0);
  const avg = total / sales.length;
  const best = sales.reduce((b, r) => (r.total > (b?.total || 0) ? r : b), sales[0]);
  const worst = sales.reduce((w, r) => (r.total < (w?.total || Infinity) ? r : w), sales[0]);
  const maxDay = Math.max(...sales.map(s => s.total));

  let dayLines = "";
  for (const s of sales) {
    const icon = s.total === best.total ? "🟢" : s.total === worst.total ? "🔴" : "⚪";
    dayLines += `${icon} ${dayName(s.date)} ${s.date.slice(5)}  ${bar(s.total / maxDay, 8)} <b>${aed(s.total)}</b>\n`;
  }

  await send(chatId,
    `📅 <b>This Week</b>  (${from.slice(5)} → ${to.slice(5)})\n\n` +
    `${dayLines}\n` +
    `┌─────────────────────\n` +
    `│ 📈 Total:    <b>${aed(total)}</b>\n` +
    `│ 📊 Avg/day:  <b>${aed(avg)}</b>\n` +
    `│ 📉 Expenses: <b>-${aed(expenses)}</b>\n` +
    `│ ✅ Net:       <b>${aed(total - expenses)}</b>\n` +
    `├─────────────────────\n` +
    `│ 🟢 Best: ${dayName(best.date)} (${aed(best.total)})\n` +
    `│ 🔴 Worst: ${dayName(worst.date)} (${aed(worst.total)})\n` +
    `└─────────────────────`,
    SALES_NAV()
  );
}

async function handleSalesMonth(chatId) {
  const month = monthStr();
  const { data } = await supabase.from("daily_sales").select("*").gte("date", month + "-01").lte("date", month + "-31").order("date");
  const sales = data || [];

  if (sales.length === 0) {
    await send(chatId, `📆 <b>${month}</b>\n\n<i>No data.</i>`, SALES_NAV());
    return;
  }

  const total = sales.reduce((s, r) => s + (r.total || 0), 0);
  const cash = sales.reduce((s, r) => s + (r.cash || 0), 0);
  const card = sales.reduce((s, r) => s + (r.card || 0), 0);
  const talabat = sales.reduce((s, r) => s + (r.talabat || 0), 0);
  const expenses = sales.reduce((s, r) => s + (r.expenses || 0), 0);
  const avg = total / sales.length;
  const best = sales.reduce((b, r) => (r.total > (b?.total || 0) ? r : b), sales[0]);
  const worst = sales.reduce((w, r) => (r.total < (w?.total || Infinity) ? r : w), sales[0]);

  // Last 7 days mini chart
  const recent = sales.slice(-7);
  const maxRecent = Math.max(...recent.map(s => s.total));
  let miniChart = "";
  for (const s of recent) {
    miniChart += `  ${s.date.slice(8)} ${bar(s.total / maxRecent, 8)} ${s.total.toFixed(0)}\n`;
  }

  await send(chatId,
    `📆 <b>Month: ${month}</b>  (${sales.length} days)\n\n` +
    `┌─ Revenue ──────────────\n` +
    `│ 📈 Total:    <b>${aed(total)}</b>\n` +
    `│ 📊 Avg/day:  <b>${aed(avg)}</b>\n` +
    `│ 🟢 Best:     ${best.date} (${aed(best.total)})\n` +
    `│ 🔴 Worst:    ${worst.date} (${aed(worst.total)})\n` +
    `├─ Channels ─────────────\n` +
    `│ 🛵 Talabat: ${aed(talabat)} (${pct(talabat, total)}%)\n` +
    `│ 💳 Card:     ${aed(card)} (${pct(card, total)}%)\n` +
    `│ 💵 Cash:     ${aed(cash)} (${pct(cash, total)}%)\n` +
    `├─ Profit ───────────────\n` +
    `│ 📉 Expenses: -${aed(expenses)}\n` +
    `│ ✅ Net:       <b>${aed(total - expenses)}</b>\n` +
    `└────────────────────────\n\n` +
    `<b>Last 7 days:</b>\n<code>${miniChart}</code>`,
    SALES_NAV()
  );
}

async function handleCompare(chatId) {
  const thisMonth = monthStr();
  const lastDate = new Date(); lastDate.setMonth(lastDate.getMonth() - 1);
  const lastMonth = monthStr(lastDate);

  const [thisRes, lastRes] = await Promise.all([
    supabase.from("daily_sales").select("*").gte("date", thisMonth + "-01").lte("date", thisMonth + "-31"),
    supabase.from("daily_sales").select("*").gte("date", lastMonth + "-01").lte("date", lastMonth + "-31"),
  ]);

  const thisSales = thisRes.data || [];
  const lastSales = lastRes.data || [];
  const thisTotal = thisSales.reduce((s, r) => s + (r.total || 0), 0);
  const lastTotal = lastSales.reduce((s, r) => s + (r.total || 0), 0);
  const thisAvg = thisSales.length > 0 ? thisTotal / thisSales.length : 0;
  const lastAvg = lastSales.length > 0 ? lastTotal / lastSales.length : 0;
  const change = lastAvg > 0 ? ((thisAvg - lastAvg) / lastAvg * 100).toFixed(1) : "N/A";
  const icon = thisAvg >= lastAvg ? "📈" : "📉";

  await send(chatId,
    `📈 <b>Month Comparison</b>\n\n` +
    `┌─ ${thisMonth} (current) ────\n` +
    `│ Revenue: <b>${aed(thisTotal)}</b>\n` +
    `│ Days: ${thisSales.length} | Avg: <b>${aed(thisAvg)}</b>/day\n` +
    `├─ ${lastMonth} (previous) ──\n` +
    `│ Revenue: <b>${aed(lastTotal)}</b>\n` +
    `│ Days: ${lastSales.length} | Avg: <b>${aed(lastAvg)}</b>/day\n` +
    `└─────────────────────\n\n` +
    `${icon} Daily avg change: <b>${change}%</b>\n` +
    `${bar(thisAvg / Math.max(thisAvg, lastAvg))} ${thisMonth}\n` +
    `${bar(lastAvg / Math.max(thisAvg, lastAvg))} ${lastMonth}`,
    BACK_BTN
  );
}

async function handleInventory(chatId) {
  const { data } = await supabase.from("inventory_items").select("name, type, qty, unit, status").in("status", ["out", "low"]);
  const items = data || [];
  const out = items.filter(i => i.status === "out");
  const low = items.filter(i => i.status === "low");

  const { count: totalCount } = await supabase.from("inventory_items").select("id", { count: "exact", head: true });

  let msg = `📦 <b>Inventory Overview</b>\n\n`;
  msg += `Total items: <b>${totalCount || 0}</b>\n`;
  msg += `${out.length === 0 ? "✅" : "🔴"} Out of stock: <b>${out.length}</b>\n`;
  msg += `${low.length === 0 ? "✅" : "🟡"} Low stock: <b>${low.length}</b>\n\n`;

  if (out.length > 0) {
    msg += `🔴 <b>OUT OF STOCK:</b>\n`;
    out.forEach(i => { msg += `  ❌ ${i.name} <i>(${i.type})</i>\n`; });
    msg += "\n";
  }
  if (low.length > 0) {
    msg += `🟡 <b>LOW STOCK:</b>\n`;
    low.forEach(i => { msg += `  ⚠️ ${i.name}: ${i.qty} ${i.unit} <i>(${i.type})</i>\n`; });
  }
  if (out.length === 0 && low.length === 0) {
    msg += `✅ <b>All items are stocked!</b>`;
  }

  await send(chatId, msg, INV_NAV);
}

async function handleInvType(chatId, type) {
  const { data } = await supabase.from("inventory_items").select("name, qty, unit, status, category").eq("type", type).order("category, name");
  const items = data || [];
  const labels = { grocery: "🥬 Grocery", packaging: "📦 Packaging", kitchen: "🍳 Kitchen / Frozen" };
  let msg = `${labels[type] || type} <b>(${items.length} items)</b>\n\n`;

  let currentCat = "";
  for (const i of items) {
    if (i.category && i.category !== currentCat) {
      currentCat = i.category;
      msg += `\n<b>${currentCat}</b>\n`;
    }
    const icon = i.status === "out" ? "❌" : i.status === "low" ? "⚠️" : "✅";
    msg += `${icon} ${i.name}: <b>${i.qty}</b> ${i.unit}\n`;
  }

  await send(chatId, msg, INV_NAV);
}

async function handleInvStatus(chatId, status) {
  const { data } = await supabase.from("inventory_items").select("name, type, qty, unit").eq("status", status).order("type, name");
  const items = data || [];
  const label = status === "out" ? "🔴 Out of Stock" : "🟡 Low Stock";
  const icon = status === "out" ? "❌" : "⚠️";

  if (items.length === 0) {
    await send(chatId, `${label}\n\n✅ No items with this status!`, INV_NAV);
    return;
  }

  let msg = `${label} <b>(${items.length} items)</b>\n\n`;
  items.forEach(i => { msg += `${icon} ${i.name}: ${i.qty} ${i.unit} <i>(${i.type})</i>\n`; });
  await send(chatId, msg, INV_NAV);
}

async function handleBank(chatId) {
  const { data } = await supabase.from("bank_transactions").select("*").order("date", { ascending: false }).limit(5);
  const txs = data || [];
  const balance = txs[0]?.balance ?? 0;

  let msg = `🏦 <b>ADCB Islamic Bank</b>\n\n`;
  msg += `💰 Balance: <b>${aed(balance)} AED</b>\n`;
  msg += `📅 As of: ${txs[0]?.date || "N/A"}\n\n`;

  if (txs.length > 0) {
    msg += `<b>Recent transactions:</b>\n`;
    for (const t of txs) {
      const icon = t.credit > 0 ? "🟢" : "🔴";
      const amt = t.credit > 0 ? `+${aed(t.credit)}` : `-${aed(t.debit)}`;
      msg += `${icon} ${t.date.slice(5)} ${t.description.slice(0, 25)} <b>${amt}</b>\n`;
    }
  }

  await send(chatId, msg, BACK_BTN);
}

async function handleEquity(chatId) {
  const { data } = await supabase.from("equity_ledger").select("*").order("created_at", { ascending: false }).limit(10);
  const entries = data || [];
  const balance = entries[0]?.running_total ?? 0;
  const ahmed50 = balance * 0.5;

  let msg = `⚖️ <b>Equity Ledger</b>\n\n`;
  msg += `┌─────────────────────\n`;
  msg += `│ 💰 Balance: <b>${aed(balance)}</b>\n`;
  msg += `│ 👤 Ahmed's 50%: <b>${aed(ahmed50)}</b>\n`;
  msg += `│ ${balance === 0 ? "✅ SETTLED — Zero balance" : "⚠️ Outstanding balance"}\n`;
  msg += `└─────────────────────\n\n`;

  if (entries.length > 1) {
    msg += `<b>Recent entries:</b>\n`;
    for (const e of entries.slice(0, 5)) {
      const icon = e.type === "personal_from_biz" ? "🔴" : e.type === "personal_into_biz" ? "🟢" : "🔵";
      const label = e.type === "personal_from_biz" ? "From biz" : e.type === "personal_into_biz" ? "Into biz" : "Adjust";
      msg += `${icon} ${e.date} ${label}: ${aed(e.amount)} → ${aed(e.running_total)}\n`;
    }
  }

  await send(chatId, msg, BACK_BTN);
}

async function handlePnL(chatId) {
  const month = monthStr();
  const { data } = await supabase.from("daily_sales").select("cash, card, talabat, total, expenses").gte("date", month + "-01").lte("date", month + "-31");
  const sales = data || [];

  const grossCash = sales.reduce((s, r) => s + (r.cash || 0), 0);
  const grossCard = sales.reduce((s, r) => s + (r.card || 0), 0);
  const grossTalabat = sales.reduce((s, r) => s + (r.talabat || 0), 0);
  const grossTotal = grossCash + grossCard + grossTalabat;
  const cardFee = grossCard * 0.0226;
  const talFee = grossTalabat * 0.283;
  const actualTotal = grossCash + (grossCard - cardFee) + (grossTalabat - talFee);
  const expenses = sales.reduce((s, r) => s + (r.expenses || 0), 0);
  const net = actualTotal - expenses;

  await send(chatId,
    `💰 <b>P&L — ${month}</b>  (${sales.length} days)\n\n` +
    `┌─ Gross Revenue ────────\n` +
    `│ 💵 Cash:      ${aed(grossCash)}\n` +
    `│ 💳 Card:       ${aed(grossCard)}\n` +
    `│ 🛵 Talabat:  ${aed(grossTalabat)}\n` +
    `│ 📈 <b>Total:     ${aed(grossTotal)}</b>\n` +
    `├─ Fees Lost ────────────\n` +
    `│ 💳 Card (2.26%):    -${aed(cardFee)}\n` +
    `│ 🛵 Talabat (28.3%): -${aed(talFee)}\n` +
    `│ 📉 <b>Total fees:  -${aed(cardFee + talFee)}</b>\n` +
    `├─ Actual Revenue ───────\n` +
    `│ ✅ <b>After fees: ${aed(actualTotal)}</b>\n` +
    `├─ Expenses ─────────────\n` +
    `│ 📉 Daily expenses: -${aed(expenses)}\n` +
    `╔═════════════════════\n` +
    `║ ${net >= 0 ? "✅" : "🔴"} NET PROFIT: <b>${aed(net)}</b>\n` +
    `╚═════════════════════\n\n` +
    `<i>Keep rate: ${pct(actualTotal, grossTotal)}% of gross</i>`,
    BACK_BTN
  );
}

async function handleProduction(chatId) {
  const today = dateStr();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const { data } = await supabase.from("production_log").select("date, item, quantity, unit").gte("date", dateStr(weekAgo)).lte("date", today).order("date", { ascending: false });
  const entries = data || [];

  if (entries.length === 0) {
    await send(chatId, `🍳 <b>Production Log</b>\n\n<i>No production logged this week.</i>`, BACK_BTN);
    return;
  }

  // Group by item
  const byItem = {};
  entries.forEach(e => {
    byItem[e.item] = (byItem[e.item] || 0) + e.quantity;
  });

  let msg = `🍳 <b>Production — Last 7 Days</b>\n\n`;
  msg += `<b>Summary:</b>\n`;
  const maxQty = Math.max(...Object.values(byItem));
  for (const [item, qty] of Object.entries(byItem).sort((a, b) => b[1] - a[1])) {
    msg += `${bar(qty / maxQty, 8)} ${item}: <b>${qty}</b>\n`;
  }

  msg += `\n<b>Recent entries:</b>\n`;
  entries.slice(0, 10).forEach(e => {
    msg += `  ${e.date.slice(5)} ${e.item}: ${e.quantity} ${e.unit}\n`;
  });

  await send(chatId, msg, BACK_BTN);
}

async function handleAlerts(chatId) {
  const [invRes, notifRes] = await Promise.all([
    supabase.from("inventory_items").select("name, type, qty, status").in("status", ["out", "low"]),
    supabase.from("notifications").select("message, severity, type, created_at").eq("read", false).order("created_at", { ascending: false }).limit(10),
  ]);

  const inv = invRes.data || [];
  const notifs = notifRes.data || [];
  const out = inv.filter(i => i.status === "out");
  const low = inv.filter(i => i.status === "low");

  let msg = `🔔 <b>Active Alerts</b>\n\n`;

  // Inventory
  msg += `<b>📦 Inventory:</b>\n`;
  if (out.length > 0) {
    msg += `🔴 ${out.length} OUT: ${out.map(i => i.name).join(", ")}\n`;
  }
  if (low.length > 0) {
    msg += `🟡 ${low.length} LOW: ${low.map(i => `${i.name}(${i.qty})`).join(", ")}\n`;
  }
  if (out.length === 0 && low.length === 0) {
    msg += `✅ All stocked\n`;
  }

  // Notifications
  if (notifs.length > 0) {
    msg += `\n<b>📋 Notifications (${notifs.length}):</b>\n`;
    for (const n of notifs.slice(0, 5)) {
      const icon = n.severity === "critical" ? "🔴" : n.severity === "warning" ? "🟡" : "🔵";
      const time = new Date(n.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      msg += `${icon} ${time}: ${n.message.slice(0, 80)}\n`;
    }
  } else {
    msg += `\n✅ No unread notifications`;
  }

  await send(chatId, msg, BACK_BTN);
}

// ─── Router ──────────────────────────────────────

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const action = query.data;
  await answer(query.id);
  await typing(chatId);

  switch (action) {
    case "menu": return handleStart(chatId);
    case "sales_today": return handleSalesToday(chatId);
    case "sales_week": return handleSalesWeek(chatId);
    case "sales_month": return handleSalesMonth(chatId);
    case "compare": return handleCompare(chatId);
    case "inventory": return handleInventory(chatId);
    case "inv_out": return handleInvStatus(chatId, "out");
    case "inv_low": return handleInvStatus(chatId, "low");
    case "inv_grocery": return handleInvType(chatId, "grocery");
    case "inv_packaging": return handleInvType(chatId, "packaging");
    case "inv_kitchen": return handleInvType(chatId, "kitchen");
    case "bank": return handleBank(chatId);
    case "equity": return handleEquity(chatId);
    case "pnl": return handlePnL(chatId);
    case "production": return handleProduction(chatId);
    case "alerts": return handleAlerts(chatId);
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").toLowerCase().trim();
  await typing(chatId);

  if (text === "/start" || text === "/help" || text === "menu" || text === "help") return handleStart(chatId);
  if (text.includes("sales today") || text.includes("مبيعات اليوم") || text === "/today") return handleSalesToday(chatId);
  if (text.includes("week") || text === "/week") return handleSalesWeek(chatId);
  if (text.includes("month") || text === "/month") return handleSalesMonth(chatId);
  if (text.includes("compare") || text.includes("مقارنة")) return handleCompare(chatId);
  if (text.includes("inventory") || text.includes("المخزون") || text === "/inventory") return handleInventory(chatId);
  if (text.includes("adcb") || text.includes("bank") || text.includes("البنك") || text === "/bank") return handleBank(chatId);
  if (text.includes("equity") || text === "/equity") return handleEquity(chatId);
  if (text.includes("pnl") || text.includes("profit") || text.includes("ربح")) return handlePnL(chatId);
  if (text.includes("production") || text.includes("إنتاج") || text === "/production") return handleProduction(chatId);
  if (text.includes("alert") || text.includes("تنبيه") || text === "/alerts") return handleAlerts(chatId);

  // Default — show menu
  await send(chatId,
    `❓ I didn't catch that.\n\nTap a button below or type a command:`,
    MAIN_MENU
  );
}

// ─── Polling ─────────────────────────────────────
let offset = 0;
async function poll() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message","callback_query"]`);
    const data = await res.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.callback_query) {
          console.log(`[${new Date().toLocaleTimeString()}] 🔘 ${update.callback_query.data}`);
          await handleCallback(update.callback_query);
        } else if (update.message) {
          console.log(`[${new Date().toLocaleTimeString()}] 💬 ${update.message.text}`);
          await handleMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.error("Poll error:", err.message);
  }
  setTimeout(poll, 500);
}

async function start() {
  // Set bot commands
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: [
      { command: "start", description: "Main menu" },
      { command: "today", description: "Today's sales" },
      { command: "week", description: "This week summary" },
      { command: "month", description: "Monthly summary" },
      { command: "inventory", description: "Inventory status" },
      { command: "bank", description: "ADCB balance" },
      { command: "equity", description: "Equity status" },
      { command: "alerts", description: "Active alerts" },
      { command: "production", description: "Production log" },
    ]}),
  });

  console.log("👑 Queen of Mahshi Bot running...");
  console.log("Features: inline buttons, visual bars, smart navigation");
  console.log("Send /start to @myrcclaudebot");
  poll();
}

start();
