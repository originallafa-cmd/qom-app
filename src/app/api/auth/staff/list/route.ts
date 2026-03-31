import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

// Public endpoint — only returns name and role, no sensitive data
export async function GET() {
  try {
    const supabase = await createServiceSupabase();
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, role")
      .eq("active", true)
      .in("role", ["staff", "manager"])
      .order("role")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
