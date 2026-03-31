import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data } = await request.json();
    const supabase = await createServiceSupabase();

    switch (type) {
      case "z_report": {
        const { date, cash, card, talabat, total } = data;
        const { error } = await supabase
          .from("daily_sales")
          .upsert({
            date,
            cash: cash || 0,
            card: card || 0,
            talabat: talabat || 0,
            expenses: 0,
            opening_cash: 0,
            pt_cash: 0,
            staff_id: session.staffId,
          }, { onConflict: "date" });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await supabase.from("audit_log").insert({
          user_id: session.staffId,
          action: "ai_save_sales",
          table_name: "daily_sales",
          new_data: { date, cash, card, talabat, total, source: "ai_upload" },
        });

        return NextResponse.json({ success: true, message: `Sales saved for ${date}` });
      }

      case "expense_receipt": {
        const { vendor, amount, category, date: expDate } = data;
        const today = expDate || new Date().toISOString().split("T")[0];

        // Get today's daily_sales entry to attach expense
        const { data: salesEntry } = await supabase
          .from("daily_sales")
          .select("id, expenses")
          .eq("date", today)
          .single();

        if (salesEntry) {
          // Add expense item
          await supabase.from("expense_items").insert({
            daily_sales_id: salesEntry.id,
            description: vendor || "Receipt upload",
            amount: amount || 0,
            category: category || "other",
          });

          // Update total expenses
          const newExpenses = (salesEntry.expenses || 0) + (amount || 0);
          await supabase.from("daily_sales").update({ expenses: newExpenses }).eq("id", salesEntry.id);
        }

        await supabase.from("audit_log").insert({
          user_id: session.staffId,
          action: "ai_save_expense",
          table_name: "expense_items",
          new_data: { vendor, amount, category, source: "ai_upload" },
        });

        return NextResponse.json({ success: true, message: `Expense ${amount} AED (${vendor}) saved` });
      }

      case "delivery_invoice": {
        const { supplier, items, date: delDate } = data;

        const { error } = await supabase.from("deliveries").insert({
          date: delDate || new Date().toISOString().split("T")[0],
          supplier: supplier || "Unknown",
          items_json: items || [],
          received_by: session.staffId,
        });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await supabase.from("audit_log").insert({
          user_id: session.staffId,
          action: "ai_save_delivery",
          table_name: "deliveries",
          new_data: { supplier, items_count: (items || []).length, source: "ai_upload" },
        });

        return NextResponse.json({ success: true, message: `Delivery from ${supplier} saved (${(items || []).length} items)` });
      }

      case "inventory_count": {
        const { items } = data;
        let updated = 0;

        for (const item of (items || [])) {
          // Try to match by name
          const { data: match } = await supabase
            .from("inventory_items")
            .select("id")
            .ilike("name", `%${item.name}%`)
            .limit(1)
            .single();

          if (match) {
            await supabase.from("inventory_items").update({ qty: item.qty }).eq("id", match.id);
            await supabase.from("inventory_counts").insert({
              item_id: match.id,
              qty: item.qty,
              counted_by: session.staffId,
            });
            updated++;
          }
        }

        await supabase.from("audit_log").insert({
          user_id: session.staffId,
          action: "ai_save_inventory",
          table_name: "inventory_items",
          new_data: { items_count: (items || []).length, updated, source: "ai_upload" },
        });

        return NextResponse.json({ success: true, message: `${updated} inventory items updated` });
      }

      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (err) {
    console.error("AI save error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
