// Claude-powered Telegram bot for Queen of Mahshi
// Run: node scripts/telegram-bot-claude.js
const Anthropic = require("@anthropic-ai/sdk").default;
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYSTEM_PROMPT = `You are the Queen of Mahshi (ملكة المحشي) restaurant assistant bot on Telegram.

Restaurant: Queen of Mahshi, Bani Yas West, Abu Dhabi
Owners: Mohamed & Ahmed (50/50 partnership)
Legal: ORIGINAL LAFA CAFETERIA LLC SPC
Staff: Cisene (head chef), Rose Catherine, Malimie, Mae Ann, Reyana
POS: Sapaad | Delivery: Talabat (28.3% total fee) | Card: Network International (2.26%)
Bank: ADCB Islamic | Equity reset to ZERO on Mar 28, 2026

You have tools to query the restaurant database. Use them to answer questions about sales, inventory, finances, etc.
- Always format currency as AED with 2 decimals
- Use HTML formatting for Telegram (<b>bold</b>, etc.)
- Be concise — this is Telegram, not a report
- Understand Arabic, English, and Filipino
- Notes column = problems only (voids, refunds, discrepancies)
- Card = POS + Link Payment + Visa + Bank Transfer combined
- No bank info in sales — financials section only`;

const TOOLS = [
  {
    name: "get_daily_sales",
    description: "Get daily sales data for a date range. Returns date, cash, card, talabat, total, expenses, net for each day.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "get_today_sales",
    description: "Get today's sales entry",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_monthly_summary",
    description: "Get monthly sales summary with totals, averages, channel splits",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format" },
      },
      required: ["month"],
    },
  },
  {
    name: "get_inventory_alerts",
    description: "Get all inventory items that are OUT or LOW stock",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_inventory_full",
    description: "Get all inventory items, optionally filtered by type",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["grocery", "packaging", "kitchen"], description: "Filter by inventory type" },
      },
    },
  },
  {
    name: "get_bank_balance",
    description: "Get current ADCB bank balance",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_equity",
    description: "Get equity ledger entries and current balance. Ahmed's 50% is half the running total.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_expenses",
    description: "Get monthly fixed expenses by category",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format" },
      },
      required: ["month"],
    },
  },
  {
    name: "get_production_log",
    description: "Get production log entries (samosa, rolls, etc.)",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
];

async function executeTool(name, input) {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  switch (name) {
    case "get_today_sales": {
      const { data } = await supabase.from("daily_sales").select("*").eq("date", today).single();
      return data || { message: "No sales entry for today yet" };
    }
    case "get_daily_sales": {
      let q = supabase.from("daily_sales").select("date, cash, card, talabat, total, expenses, net").order("date", { ascending: false });
      if (input.from) q = q.gte("date", input.from);
      if (input.to) q = q.lte("date", input.to);
      const { data } = await q.limit(60);
      return data || [];
    }
    case "get_monthly_summary": {
      const month = input.month || currentMonth;
      const { data } = await supabase.from("daily_sales").select("*").gte("date", month + "-01").lte("date", month + "-31").order("date");
      const sales = data || [];
      const total = sales.reduce((s, r) => s + (r.total || 0), 0);
      return {
        month, days: sales.length, totalRevenue: total,
        avgDaily: sales.length > 0 ? total / sales.length : 0,
        cash: sales.reduce((s, r) => s + (r.cash || 0), 0),
        card: sales.reduce((s, r) => s + (r.card || 0), 0),
        talabat: sales.reduce((s, r) => s + (r.talabat || 0), 0),
        expenses: sales.reduce((s, r) => s + (r.expenses || 0), 0),
      };
    }
    case "get_inventory_alerts": {
      const { data } = await supabase.from("inventory_items").select("name, type, qty, unit, status").in("status", ["out", "low"]);
      return data || [];
    }
    case "get_inventory_full": {
      let q = supabase.from("inventory_items").select("name, type, category, qty, unit, status, reorder_at").order("name");
      if (input.type) q = q.eq("type", input.type);
      const { data } = await q;
      return data || [];
    }
    case "get_bank_balance": {
      const { data } = await supabase.from("bank_transactions").select("balance, date, description").order("date", { ascending: false }).limit(5);
      return { current: data?.[0]?.balance ?? 0, recentTransactions: data || [] };
    }
    case "get_equity": {
      const { data } = await supabase.from("equity_ledger").select("*").order("created_at", { ascending: false }).limit(10);
      return { currentBalance: data?.[0]?.running_total ?? 0, entries: data || [] };
    }
    case "get_expenses": {
      const { data } = await supabase.from("expenses_monthly").select("*").eq("month", input.month || currentMonth);
      return data || [];
    }
    case "get_production_log": {
      let q = supabase.from("production_log").select("date, item, quantity, unit, notes").order("date", { ascending: false });
      if (input.from) q = q.gte("date", input.from);
      if (input.to) q = q.lte("date", input.to);
      const { data } = await q.limit(30);
      return data || [];
    }
    default:
      return { error: "Unknown tool" };
  }
}

async function sendMessage(chatId, text) {
  // Telegram has 4096 char limit
  const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "HTML" }),
    });
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userText = msg.text || "";

  if (!userText.trim()) return;

  try {
    // Send typing indicator
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // Call Claude with tools
    let messages = [{ role: "user", content: userText }];
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`  Tool: ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });
    }

    // Extract text response
    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock) {
      await sendMessage(chatId, textBlock.text);
    }
  } catch (err) {
    console.error("Claude error:", err.message);
    await sendMessage(chatId, "⚠️ Sorry, something went wrong. Try again.");
  }
}

// Polling loop
let offset = 0;
async function poll() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
    const data = await res.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message) {
          console.log(`[${new Date().toLocaleTimeString()}] ${update.message.chat.first_name}: ${update.message.text}`);
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
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY not set in .env.local");
    process.exit(1);
  }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  console.log("🤖 QoM Claude Bot running (powered by Claude Sonnet)...");
  console.log("Send any message to @myrcclaudebot on Telegram");
  console.log("Examples: 'how did we do this month?', 'what's out of stock?', 'compare march vs february'");
  poll();
}

start();
