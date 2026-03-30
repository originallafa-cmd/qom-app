import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, type, category, qty, unit, reorder_at, status, priority")
      .in("status", ["out", "low"])
      .order("status")
      .order("priority");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
