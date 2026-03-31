import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ name: null }, { status: 401 });
  }

  // Get role and must_change_pin from DB
  const supabase = await createServiceSupabase();
  const { data } = await supabase
    .from("staff")
    .select("role, must_change_pin")
    .eq("id", session.staffId)
    .single();

  return NextResponse.json({
    name: session.staffName,
    id: session.staffId,
    role: data?.role || "staff",
    mustChangePin: data?.must_change_pin ?? false,
  });
}
