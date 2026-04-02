import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getStaffSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, cash, card, talabat, opening_cash, pt_cash, notes, expense_items, confirmUpdate } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Block dates more than 1 day in the future
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date > tomorrow.toISOString().split("T")[0]) {
      return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
    }

    const supabase = await createServiceSupabase();

    // Business day ends at 2 AM — if it's before 2 AM, the "today" is actually yesterday
    const now = new Date();
    const hour = now.getHours();
    let businessToday: string;
    if (hour < 2) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      businessToday = yesterday.toISOString().split("T")[0];
    } else {
      businessToday = now.toISOString().split("T")[0];
    }

    // Check if entry already exists for this date
    const { data: existing } = await supabase
      .from("daily_sales")
      .select("id, created_at, staff:staff_id(name)")
      .eq("date", date)
      .single();

    if (existing) {
      // Same-day edit check: allow if date matches business today
      if (date !== businessToday) {
        return NextResponse.json(
          { error: "Cannot edit previous day entries. Ask admin." },
          { status: 403 }
        );
      }

      // If not confirmed, tell frontend to ask user
      if (!confirmUpdate) {
        const submittedBy = (existing.staff as unknown as { name: string })?.name || "Unknown";
        return NextResponse.json({
          exists: true,
          message: `Sales for ${date} already submitted by ${submittedBy}. Update it?`,
          submittedBy,
        }, { status: 409 });
      }

      // Update existing entry
      const totalExpenses = (expense_items || []).reduce(
        (sum: number, item: { amount: number }) => sum + item.amount,
        0
      );

      const { error: updateError } = await supabase
        .from("daily_sales")
        .update({
          cash,
          card,
          talabat,
          opening_cash,
          pt_cash,
          expenses: totalExpenses,
          notes,
          updated_by: session.staffId,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Replace expense items
      await supabase.from("expense_items").delete().eq("daily_sales_id", existing.id);

      if (expense_items?.length > 0) {
        await supabase.from("expense_items").insert(
          expense_items.map((item: { description: string; amount: number; category: string }) => ({
            daily_sales_id: existing.id,
            description: item.description,
            amount: item.amount,
            category: item.category,
          }))
        );
      }

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: session.staffId,
        action: "update",
        table_name: "daily_sales",
        record_id: existing.id,
        new_data: body,
      });

      return NextResponse.json({ success: true, id: existing.id, action: "updated" });
    }

    // Create new entry
    const totalExpenses = (expense_items || []).reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );

    const { data: newEntry, error: insertError } = await supabase
      .from("daily_sales")
      .insert({
        date,
        cash,
        card,
        talabat,
        opening_cash,
        pt_cash,
        expenses: totalExpenses,
        notes,
        staff_id: session.staffId,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Insert expense items
    if (expense_items?.length > 0) {
      await supabase.from("expense_items").insert(
        expense_items.map((item: { description: string; amount: number; category: string }) => ({
          daily_sales_id: newEntry.id,
          description: item.description,
          amount: item.amount,
          category: item.category,
        }))
      );
    }

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: session.staffId,
      action: "create",
      table_name: "daily_sales",
      record_id: newEntry.id,
      new_data: body,
    });

    return NextResponse.json({ success: true, id: newEntry.id, action: "created" });
  } catch (err) {
    console.error("Sales API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
