import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

// Cloud vault — stores markdown notes in Supabase when PC is offline
// Syncs to D:\vault\ when PC is available via vault-sync

export async function GET(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder");

    const supabase = await createServiceSupabase();
    let query = supabase
      .from("settings")
      .select("key, value")
      .like("key", "vault_note:%")
      .order("key");

    const { data } = await query;

    const notes = (data || []).map(row => {
      const path = row.key.replace("vault_note:", "");
      return { path, content: row.value, folder: path.split("/")[0] || "" };
    }).filter(n => !folder || n.folder === folder);

    return NextResponse.json(notes);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { path, content } = await request.json();
    if (!path || !content) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();
    const key = `vault_note:${path}`;

    // Upsert — create or update
    const { error } = await supabase
      .from("settings")
      .upsert({ key, value: JSON.stringify(content), updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, path });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { path } = await request.json();
    const supabase = await createServiceSupabase();
    await supabase.from("settings").delete().eq("key", `vault_note:${path}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
