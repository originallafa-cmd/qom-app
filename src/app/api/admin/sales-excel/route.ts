import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";
import * as XLSX from "xlsx";
import { readFile, writeFile } from "fs/promises";

const SOURCE_FILE = "D:\\QoM_Sales_Report_updated.xlsx";

export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const supabase = await createServiceSupabase();

    // Read the existing Excel file as template
    let wb: XLSX.WorkBook;
    try {
      const buf = await readFile(SOURCE_FILE);
      wb = XLSX.read(buf);
    } catch {
      return NextResponse.json({ error: "Source Excel file not found on server" }, { status: 500 });
    }

    // Get all sales data from DB
    const { data: sales } = await supabase
      .from("daily_sales")
      .select("date, cash, card, talabat, total, expenses, net, notes, opening_cash, pt_cash, closing_cash, staff:staff_id(name)")
      .order("date");

    const allSales = sales || [];

    // Group by month
    const monthNames: Record<string, string> = {
      "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
      "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    };

    const salesByMonth: Record<string, typeof allSales> = {};
    allSales.forEach(s => {
      const [year, mon] = s.date.split("-");
      const sheetName = `${monthNames[mon]} ${year}`;
      if (!salesByMonth[sheetName]) salesByMonth[sheetName] = [];
      salesByMonth[sheetName].push(s);
    });

    // Update each monthly sheet in the existing workbook
    for (const [sheetName, rows] of Object.entries(salesByMonth)) {
      if (!wb.SheetNames.includes(sheetName)) {
        // Sheet doesn't exist — create it
        const ws = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const ws = wb.Sheets[sheetName];

      // Find the header row (contains "Date", "Cash", etc.)
      const sheetData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      let headerIdx = -1;
      for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        const row = sheetData[i];
        if (row && row.some((c: string) => String(c || "").toLowerCase() === "date")) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        // No header found — write fresh with header
        headerIdx = 1; // Leave row 0 for title
        XLSX.utils.sheet_add_aoa(ws, [[sheetName]], { origin: "A1" });
        XLSX.utils.sheet_add_aoa(ws, [["Date", "Cash", "Card", "Talabat", "Total Sales", "Expenses", "Net", "Notes", "Opening Cash", "PT Cash Top-up", "Closing Cash"]], { origin: `A${headerIdx + 1}` });
      }

      const headers = sheetData[headerIdx] || [];
      const colMap: Record<string, number> = {};
      headers.forEach((h: string, i: number) => {
        const key = String(h || "").toLowerCase().trim();
        if (key.includes("date")) colMap.date = i;
        if (key.includes("cash") && !key.includes("opening") && !key.includes("closing") && !key.includes("pt")) colMap.cash = i;
        if (key.includes("card")) colMap.card = i;
        if (key.includes("talabat")) colMap.talabat = i;
        if (key.includes("total")) colMap.total = i;
        if (key.includes("expense")) colMap.expenses = i;
        if (key.includes("net")) colMap.net = i;
        if (key.includes("note")) colMap.notes = i;
        if (key.includes("opening")) colMap.opening = i;
        if (key.includes("pt") || key.includes("top")) colMap.ptcash = i;
        if (key.includes("closing")) colMap.closing = i;
      });

      // Write each day's data into the correct row
      rows.forEach((sale, idx) => {
        const rowNum = headerIdx + 1 + idx; // 0-indexed in sheet_add_aoa
        const rowData = new Array(Math.max(...Object.values(colMap)) + 1).fill("");

        if (colMap.date !== undefined) rowData[colMap.date] = sale.date;
        if (colMap.cash !== undefined) rowData[colMap.cash] = sale.cash;
        if (colMap.card !== undefined) rowData[colMap.card] = sale.card;
        if (colMap.talabat !== undefined) rowData[colMap.talabat] = sale.talabat;
        if (colMap.total !== undefined) rowData[colMap.total] = sale.total;
        if (colMap.expenses !== undefined) rowData[colMap.expenses] = sale.expenses;
        if (colMap.net !== undefined) rowData[colMap.net] = sale.net;
        if (colMap.notes !== undefined) rowData[colMap.notes] = sale.notes || "";
        if (colMap.opening !== undefined) rowData[colMap.opening] = sale.opening_cash;
        if (colMap.ptcash !== undefined) rowData[colMap.ptcash] = sale.pt_cash;
        if (colMap.closing !== undefined) rowData[colMap.closing] = sale.closing_cash;

        XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: `A${rowNum + 1}` });
      });
    }

    // Save updated file back to D:\
    const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    await writeFile(SOURCE_FILE, outBuf);

    // Also save to vault
    try {
      await writeFile("D:\\vault\\01 - Queen of Mahshi\\Finance\\QoM_Sales_Report_updated.xlsx", outBuf);
    } catch { /* vault copy is optional */ }

    // Return the file as download
    return new NextResponse(outBuf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="QoM_Sales_Report_updated.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Sales Excel error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
