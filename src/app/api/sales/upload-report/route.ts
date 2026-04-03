import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const date = formData.get("date") as string;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const supabase = await createServiceSupabase();
    const fileName = `daily-reports/${date}_${session.staffName.replace(/\s/g, "_")}.jpg`;

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from("reports")
      .upload(fileName, bytes, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Save reference in audit log
    await supabase.from("audit_log").insert({
      user_id: session.staffId,
      action: "upload_report_photo",
      table_name: "daily_sales",
      new_data: { date, fileName, staff: session.staffName },
    });

    return NextResponse.json({ success: true, path: fileName });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
