import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

// Auto-deduct inventory based on sales + recipe map
// Called after daily sales entry or manually from admin
export async function POST(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { date } = await request.json();
    const targetDate = date || new Date().toISOString().split("T")[0];

    const supabase = await createServiceSupabase();

    // Get orders for the date (from orders_history)
    const { data: orders } = await supabase
      .from("orders_history")
      .select("id, amount, payment_type, status")
      .gte("datetime", targetDate + "T00:00:00")
      .lte("datetime", targetDate + "T23:59:59")
      .eq("status", "completed");

    // Get all recipe ingredients with their inventory items
    const { data: recipes } = await supabase
      .from("recipe_ingredients")
      .select("menu_item_id, inventory_item_id, qty_used, unit, type, menu_item:menu_item_id(name), inventory_item:inventory_item_id(id, name, qty)")
      .order("menu_item_id");

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No recipes mapped yet. Go to Admin → Recipe Map to set up recipes first.",
        deductions: [],
      });
    }

    // For now, use daily sales totals + average order value to estimate order count
    // In the future, this will use actual Sapaad order data
    const { data: daySales } = await supabase
      .from("daily_sales")
      .select("total")
      .eq("date", targetDate)
      .single();

    const orderCount = orders?.length || 0;
    const totalSales = daySales?.total || 0;

    if (orderCount === 0 && totalSales === 0) {
      return NextResponse.json({
        success: false,
        message: `No sales or orders found for ${targetDate}`,
        deductions: [],
      });
    }

    // Group recipe ingredients by inventory item
    const deductions: Record<string, { itemId: string; itemName: string; totalDeduct: number; unit: string }> = {};

    // If we have individual orders, we could match to menu items
    // For now, do a proportional deduction based on total recipes mapped
    // This is a simplified approach — will get smarter with AI learning

    // Calculate total deductions based on order count
    // Each order is assumed to be ~1 menu item (simplified)
    const avgOrdersPerDay = orderCount > 0 ? orderCount : Math.round(totalSales / 70); // ~70 AED AOV

    for (const recipe of recipes) {
      const invItem = recipe.inventory_item as unknown as { id: string; name: string; qty: number };
      if (!invItem?.id) continue;

      const key = invItem.id;
      if (!deductions[key]) {
        deductions[key] = { itemId: invItem.id, itemName: invItem.name, totalDeduct: 0, unit: recipe.unit };
      }
      // Proportional: each mapped recipe item contributes to deduction
      // Weight by how many recipes use this item
      deductions[key].totalDeduct += recipe.qty_used;
    }

    // Apply deductions
    const results = [];
    for (const [, deduction] of Object.entries(deductions)) {
      // Scale by estimated order count / number of menu items with recipes
      const uniqueMenuItems = new Set(recipes.map(r => r.menu_item_id)).size;
      const scaleFactor = avgOrdersPerDay / Math.max(uniqueMenuItems, 1);
      const deductAmount = deduction.totalDeduct * scaleFactor;

      const { data: current } = await supabase
        .from("inventory_items")
        .select("qty")
        .eq("id", deduction.itemId)
        .single();

      if (current) {
        const newQty = Math.max(0, (current.qty || 0) - deductAmount);
        await supabase.from("inventory_items").update({ qty: newQty }).eq("id", deduction.itemId);

        // Log usage for AI learning
        await supabase.from("usage_log").insert({
          date: targetDate,
          inventory_item_id: deduction.itemId,
          expected_usage: deductAmount,
          actual_usage: 0, // Will be filled when staff does physical count
          difference: 0,
        });

        results.push({
          item: deduction.itemName,
          deducted: Math.round(deductAmount * 100) / 100,
          was: current.qty,
          now: Math.round(newQty * 100) / 100,
        });
      }
    }

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: auth.userId,
      action: "auto_deduct_inventory",
      table_name: "inventory_items",
      new_data: { date: targetDate, orderCount: avgOrdersPerDay, deductions: results.length },
    });

    return NextResponse.json({
      success: true,
      message: `Deducted ${results.length} items based on ${avgOrdersPerDay} estimated orders`,
      date: targetDate,
      deductions: results,
    });
  } catch (err) {
    console.error("Auto-deduct error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
