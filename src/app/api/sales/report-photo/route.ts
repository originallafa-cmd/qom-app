import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

    const supabase = await createServiceSupabase();

    // List files matching this date
    const { data: files } = await supabase.storage
      .from("reports")
      .list("daily-reports", { search: date });

    const matching = (files || []).filter(f => f.name.startsWith(date));

    if (matching.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Get signed URL for the photo
    const { data: urlData } = await supabase.storage
      .from("reports")
      .createSignedUrl(`daily-reports/${matching[0].name}`, 3600); // 1 hour

    return NextResponse.json({
      found: true,
      url: urlData?.signedUrl,
      fileName: matching[0].name,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
