import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { requireStaffOrAdmin, unauthorizedResponse } from "@/lib/api-auth";
import * as XLSX from "xlsx";

const STORAGE_BUCKET = "reports";
const FILE_NAME = "QoM_Sales_Report_updated.xlsx";

export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if (!auth.authorized) return unauthorizedResponse();

    const supabase = await createServiceSupabase();

    // 1. Download existing Excel from Supabase Storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(FILE_NAME);

    if (dlError || !fileData) {
      return NextResponse.json({ error: "Excel template not found in storage" }, { status: 500 });
    }

    const templateBuf = Buffer.from(await fileData.arrayBuffer());
    const wb = XLSX.read(templateBuf);

    // 2. Get all sales data from DB
    const { data: sales } = await supabase
      .from("daily_sales")
      .select("date, cash, card, talabat, total, expenses, net, notes, opening_cash, pt_cash, closing_cash, staff:staff_id(name)")
      .order("date");

    const allSales = sales || [];

    // 3. Group by month sheet name
    const monthNames: Record<string, string> = {
      "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
      "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    };

    const salesBySheet: Record<string, typeof allSales> = {};
    allSales.forEach(s => {
      const [year, mon] = s.date.split("-");
      const sheetName = `${monthNames[mon]} ${year}`;
      if (!salesBySheet[sheetName]) salesBySheet[sheetName] = [];
      salesBySheet[sheetName].push(s);
    });

    // 4. Update each monthly sheet
    for (const [sheetName, rows] of Object.entries(salesBySheet)) {
      if (!wb.SheetNames.includes(sheetName)) {
        // Create new sheet if month doesn't exist
        const newWs = XLSX.utils.aoa_to_sheet([
          [sheetName],
          [],
          ["Date", "Cash", "Card", "Talabat", "Total Sales", "Expenses", "Net", "Notes", "Opening Cash", "PT Cash Top-up", "Closing Cash"],
        ]);
        XLSX.utils.book_append_sheet(wb, newWs, sheetName);
      }

      const ws = wb.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });

      // Find header row
      let headerIdx = -1;
      for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        if (sheetData[i]?.some(c => String(c || "").toLowerCase() === "date")) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) continue;

      // Map columns
      const headers = sheetData[headerIdx] || [];
      const col: Record<string, number> = {};
      headers.forEach((h, i) => {
        const k = String(h || "").toLowerCase().trim();
        if (k.includes("date")) col.date = i;
        if (k.includes("cash") && !k.includes("opening") && !k.includes("closing") && !k.includes("pt")) col.cash = i;
        if (k.includes("card")) col.card = i;
        if (k.includes("talabat")) col.talabat = i;
        if (k.includes("total")) col.total = i;
        if (k.includes("expense")) col.expenses = i;
        if (k === "net") col.net = i;
        if (k.includes("note")) col.notes = i;
        if (k.includes("opening")) col.opening = i;
        if (k.includes("pt") || k.includes("top")) col.ptcash = i;
        if (k.includes("closing")) col.closing = i;
      });

      // Write data rows
      rows.forEach((sale, idx) => {
        const rowNum = headerIdx + 1 + idx;
        const maxCol = Math.max(...Object.values(col), 0) + 1;
        const rowData = new Array(maxCol).fill("");

        if (col.date !== undefined) rowData[col.date] = sale.date;
        if (col.cash !== undefined) rowData[col.cash] = sale.cash;
        if (col.card !== undefined) rowData[col.card] = sale.card;
        if (col.talabat !== undefined) rowData[col.talabat] = sale.talabat;
        if (col.total !== undefined) rowData[col.total] = sale.total;
        if (col.expenses !== undefined) rowData[col.expenses] = sale.expenses;
        if (col.net !== undefined) rowData[col.net] = sale.net;
        if (col.notes !== undefined) rowData[col.notes] = sale.notes || "";
        if (col.opening !== undefined) rowData[col.opening] = sale.opening_cash;
        if (col.ptcash !== undefined) rowData[col.ptcash] = sale.pt_cash;
        if (col.closing !== undefined) rowData[col.closing] = sale.closing_cash;

        XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: `A${rowNum + 1}` });
      });
    }

    // 5. Generate updated file
    const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 6. Save back to Supabase Storage (overwrite)
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(FILE_NAME, outBuf, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    // 7. Also save to local D:\ if PC is available
    try {
      const { writeFile } = await import("fs/promises");
      await writeFile("D:\\QoM_Sales_Report_updated.xlsx", outBuf);
      await writeFile("D:\\vault\\01 - Queen of Mahshi\\Finance\\QoM_Sales_Report_updated.xlsx", outBuf);
    } catch { /* PC offline — that's fine */ }

    // 8. Return file download
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
