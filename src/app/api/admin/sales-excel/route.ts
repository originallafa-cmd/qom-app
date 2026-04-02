import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const supabase = await createServiceSupabase();

    // Get all sales data
    const { data: sales } = await supabase
      .from("daily_sales")
      .select("date, cash, card, talabat, total, expenses, net, notes, opening_cash, pt_cash, closing_cash, staff:staff_id(name)")
      .order("date");

    const allSales = sales || [];

    // Group by month
    const months: Record<string, typeof allSales> = {};
    allSales.forEach(s => {
      const monthKey = s.date.slice(0, 7); // "2026-04"
      if (!months[monthKey]) months[monthKey] = [];
      months[monthKey].push(s);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, rows]) => {
      const total = rows.reduce((s, r) => s + (r.total || 0), 0);
      const cash = rows.reduce((s, r) => s + (r.cash || 0), 0);
      const card = rows.reduce((s, r) => s + (r.card || 0), 0);
      const talabat = rows.reduce((s, r) => s + (r.talabat || 0), 0);
      const expenses = rows.reduce((s, r) => s + (r.expenses || 0), 0);
      return {
        Month: month,
        Days: rows.length,
        Cash: cash,
        Card: card,
        Talabat: talabat,
        "Total Sales": total,
        Expenses: expenses,
        Net: total - expenses,
        "Avg/Day": rows.length > 0 ? Math.round(total / rows.length * 100) / 100 : 0,
        "Cash %": total > 0 ? Math.round(cash / total * 1000) / 10 : 0,
        "Card %": total > 0 ? Math.round(card / total * 1000) / 10 : 0,
        "Talabat %": total > 0 ? Math.round(talabat / total * 1000) / 10 : 0,
      };
    });
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Monthly sheets
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).forEach(([month, rows]) => {
      const [year, mon] = month.split("-");
      const sheetName = `${monthNames[parseInt(mon)]} ${year}`;

      const sheetData = rows.map(r => ({
        Date: r.date,
        Cash: r.cash,
        Card: r.card,
        Talabat: r.talabat,
        "Total Sales": r.total,
        Expenses: r.expenses,
        Net: r.net,
        Notes: r.notes || "",
        "Opening Cash": r.opening_cash,
        "PT Cash": r.pt_cash,
        "Closing Cash": r.closing_cash,
        "Submitted By": (r.staff as unknown as { name: string })?.name || "",
      }));

      // Add totals row
      const totals = {
        Date: "TOTAL",
        Cash: rows.reduce((s, r) => s + (r.cash || 0), 0),
        Card: rows.reduce((s, r) => s + (r.card || 0), 0),
        Talabat: rows.reduce((s, r) => s + (r.talabat || 0), 0),
        "Total Sales": rows.reduce((s, r) => s + (r.total || 0), 0),
        Expenses: rows.reduce((s, r) => s + (r.expenses || 0), 0),
        Net: rows.reduce((s, r) => s + (r.net || 0), 0),
        Notes: "",
        "Opening Cash": "",
        "PT Cash": "",
        "Closing Cash": "",
        "Submitted By": `${rows.length} days`,
      };
      sheetData.push(totals as typeof sheetData[0]);

      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="QoM_Sales_Report_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Sales Excel error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
