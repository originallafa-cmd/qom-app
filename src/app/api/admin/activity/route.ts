import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, action, table_name, record_id, new_data, created_at, staff:user_id(name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const entries = (data || []).map((a) => ({
      id: a.id,
      action: a.action,
      table: a.table_name,
      recordId: a.record_id,
      data: a.new_data,
      time: a.created_at,
      staff: (a.staff as unknown as { name: string })?.name || "System",
    }));

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
