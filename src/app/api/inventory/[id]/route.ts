import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceSupabase();

    const { data, error } = await supabase
      .from("inventory_items")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { id } = await params;
    const supabase = await createServiceSupabase();

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
