// Import daily sales from QoM_Sales_Report_updated.xlsx into Supabase
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FILE_PATH = "D:\\vault\\01 - Queen of Mahshi\\Finance\\QoM_Sales_Report_updated.xlsx";
const MONTH_SHEETS = ["Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"];

async function main() {
  const wb = XLSX.readFile(FILE_PATH);
  let totalImported = 0;
  let totalSkipped = 0;

  for (const sheetName of MONTH_SHEETS) {
    if (!wb.SheetNames.includes(sheetName)) {
      console.log(`Sheet "${sheetName}" not found, skipping`);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Find header row (contains "Date", "Cash", etc.)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row && row.some((c) => String(c).toLowerCase() === "date")) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      console.log(`No header found in "${sheetName}", skipping`);
      continue;
    }

    const headers = rows[headerIdx].map((h) => String(h || "").toLowerCase().trim());
    const dateIdx = headers.indexOf("date");
    const cashIdx = headers.findIndex((h) => h.includes("cash") && !h.includes("opening") && !h.includes("closing") && !h.includes("pt"));
    const cardIdx = headers.findIndex((h) => h.includes("card"));
    const talabatIdx = headers.findIndex((h) => h.includes("talabat"));
    const expensesIdx = headers.findIndex((h) => h.includes("expense"));
    const notesIdx = headers.findIndex((h) => h.includes("note"));
    const openingIdx = headers.findIndex((h) => h.includes("opening"));
    const ptCashIdx = headers.findIndex((h) => h.includes("pt cash") || h.includes("top-up") || h.includes("topup"));

    console.log(`\n=== ${sheetName} === (header at row ${headerIdx})`);
    console.log(`  Columns: date=${dateIdx} cash=${cashIdx} card=${cardIdx} talabat=${talabatIdx} expenses=${expensesIdx}`);

    const dataRows = rows.slice(headerIdx + 1);
    let sheetImported = 0;

    for (const row of dataRows) {
      if (!row || !row[dateIdx]) continue;

      // Parse date
      let dateVal = row[dateIdx];
      let dateStr;

      if (typeof dateVal === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(dateVal);
        dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else if (typeof dateVal === "string") {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split("T")[0];
        } else {
          continue; // Skip non-date rows (like "TOTAL")
        }
      } else {
        continue;
      }

      // Skip future dates or non-data rows
      if (!dateStr || dateStr > "2026-03-31") continue;

      const cash = parseFloat(row[cashIdx]) || 0;
      const card = parseFloat(row[cardIdx]) || 0;
      const talabat = parseFloat(row[talabatIdx]) || 0;
      const total = cash + card + talabat;

      if (total === 0) continue; // Skip empty rows

      const expenses = expensesIdx >= 0 ? parseFloat(row[expensesIdx]) || 0 : 0;
      const notes = notesIdx >= 0 && row[notesIdx] ? String(row[notesIdx]).trim() : null;
      const openingCash = openingIdx >= 0 ? parseFloat(row[openingIdx]) || 0 : 0;
      const ptCash = ptCashIdx >= 0 ? parseFloat(row[ptCashIdx]) || 0 : 0;

      // Upsert (skip if date already exists)
      const { error } = await supabase
        .from("daily_sales")
        .upsert(
          {
            date: dateStr,
            cash,
            card,
            talabat,
            expenses,
            notes: notes || null,
            opening_cash: openingCash,
            pt_cash: ptCash,
          },
          { onConflict: "date" }
        );

      if (error) {
        console.log(`  ERROR ${dateStr}: ${error.message}`);
        totalSkipped++;
      } else {
        sheetImported++;
      }
    }

    console.log(`  Imported: ${sheetImported} days`);
    totalImported += sheetImported;
  }

  console.log(`\n=== DONE === Total imported: ${totalImported}, Skipped: ${totalSkipped}`);
}

main().catch(console.error);
