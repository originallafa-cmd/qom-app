import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("inventory_items")
      .select("type");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const counts = { grocery: 0, packaging: 0, kitchen: 0 };
    (data || []).forEach((r) => {
      if (r.type in counts) counts[r.type as keyof typeof counts]++;
    });

    return NextResponse.json(counts);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
