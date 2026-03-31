import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { item_id, qty } = body;

    if (!item_id || qty === undefined) {
      return NextResponse.json({ error: "item_id and qty required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();

    // Update item quantity
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ qty })
      .eq("id", item_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the count
    const { error: countError } = await supabase
      .from("inventory_counts")
      .insert({
        item_id,
        qty,
        counted_by: session?.staffId || null,
      });

    if (countError) {
      console.error("Count log error:", countError);
    }

    // Audit
    await supabase.from("audit_log").insert({
      user_id: session?.staffId || null,
      action: "inventory_count",
      table_name: "inventory_items",
      record_id: item_id,
      new_data: { qty },
    });

    // Check if item is now low/out and create notification
    const { data: item } = await supabase
      .from("inventory_items")
      .select("name, status, type")
      .eq("id", item_id)
      .single();

    if (item && (item.status === "out" || item.status === "low")) {
      await supabase.from("notifications").insert({
        type: "inventory",
        message: `${item.name} (${item.type}) is ${item.status === "out" ? "OUT OF STOCK" : "LOW STOCK"} — qty: ${qty}`,
        severity: item.status === "out" ? "critical" : "warning",
        data: { item_id, item_name: item.name, qty, status: item.status },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
