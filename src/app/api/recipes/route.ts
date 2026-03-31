import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get("menuItemId");

    const supabase = await createServiceSupabase();

    if (menuItemId) {
      // Get recipe for specific menu item
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*, inventory_item:inventory_item_id(name, unit, type)")
        .eq("menu_item_id", menuItemId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || []);
    }

    // Get all menu items with recipe count
    const { data: items, error } = await supabase
      .from("menu_items")
      .select("*, recipe_ingredients(id)")
      .eq("active", true)
      .order("category")
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json((items || []).map(item => ({
      ...item,
      ingredientCount: (item.recipe_ingredients || []).length,
      recipe_ingredients: undefined,
    })));
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const body = await request.json();
    const { menuItemId, inventoryItemId, qtyUsed, unit, type } = body;

    if (!menuItemId || !inventoryItemId || !qtyUsed) {
      return NextResponse.json({ error: "menuItemId, inventoryItemId, qtyUsed required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .insert({
        menu_item_id: menuItemId,
        inventory_item_id: inventoryItemId,
        qty_used: qtyUsed,
        unit: unit || "pcs",
        type: type || "ingredient",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { id } = await request.json();
    const supabase = await createServiceSupabase();
    await supabase.from("recipe_ingredients").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
