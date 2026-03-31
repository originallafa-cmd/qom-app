import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_inventory",
    description: "Get inventory items, optionally filtered by type or status",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["grocery", "packaging", "kitchen"] },
        status: { type: "string", enum: ["ok", "low", "out"] },
        search: { type: "string", description: "Search by name" },
      },
    },
  },
  {
    name: "update_inventory",
    description: "Update quantity of an inventory item",
    input_schema: {
      type: "object" as const,
      properties: {
        item_id: { type: "string" },
        qty: { type: "number" },
      },
      required: ["item_id", "qty"],
    },
  },
  {
    name: "get_sales",
    description: "Get daily sales for a date range",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string" },
        to: { type: "string" },
      },
    },
  },
  {
    name: "get_reminders",
    description: "Get current inventory reminders and alerts",
    input_schema: { type: "object" as const, properties: {} },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: Record<string, unknown>, supabase: any) {
  switch (name) {
    case "get_inventory": {
      let q = supabase.from("inventory_items").select("id, name, type, qty, unit, status, reorder_at").order("name");
      if (input.type) q = q.eq("type", input.type as string);
      if (input.status) q = q.eq("status", input.status as string);
      if (input.search) q = q.ilike("name", `%${input.search}%`);
      const { data } = await q.limit(20);
      return data || [];
    }
    case "update_inventory": {
      await supabase.from("inventory_items").update({ qty: input.qty as number }).eq("id", input.item_id as string);
      await supabase.from("inventory_counts").insert({ item_id: input.item_id, qty: input.qty });
      return { success: true, item_id: input.item_id, new_qty: input.qty };
    }
    case "get_sales": {
      let q = supabase.from("daily_sales").select("date, cash, card, talabat, total, expenses, net").order("date", { ascending: false });
      if (input.from) q = q.gte("date", input.from as string);
      if (input.to) q = q.lte("date", input.to as string);
      const { data } = await q.limit(30);
      return data || [];
    }
    case "get_reminders": {
      const { data } = await supabase.from("inventory_items").select("name, type, qty, unit, status").in("status", ["out", "low"]);
      return data || [];
    }
    default:
      return { error: "Unknown tool" };
  }
}

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const supabase = await createServiceSupabase();

    const systemPrompt = `You are the Queen of Mahshi restaurant assistant. You help staff with inventory, sales, and operations.

Staff member: ${session.staffName}
Today: ${new Date().toISOString().split("T")[0]}

RULES:
- Be brief and helpful — this is a chat on a phone
- If staff says they bought something, update inventory
- If they ask about stock, check inventory
- Confirm before making changes: "Update milk to 5? Yes/No"
- Respond in the same language the staff uses (English, Arabic, or Filipino)
- Use emojis for status: ✅ done, ⚠️ low, ❌ out`;

    let messages: Anthropic.MessageParam[] = [{ role: "user", content: message }];
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const results: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUses) {
        const result = await executeTool(tu.name, tu.input as Record<string, unknown>, supabase);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });
      }

      messages = [...messages, { role: "assistant", content: response.content }, { role: "user", content: results }];
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    }

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");

    // Log interaction
    await supabase.from("ai_interactions").insert({
      staff_id: session.staffId,
      type: "chat",
      input_summary: message.slice(0, 200),
      output_summary: (text?.text || "").slice(0, 200),
      confirmed: true,
    });

    return NextResponse.json({ reply: text?.text || "I couldn't process that." });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
