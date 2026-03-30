// Import Sapaad order CSVs into orders_history
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CSV_DIR = "C:\\Users\\PC\\Downloads";
const CSV_FILES = [
  "Total Orders_31331_1773392514.csv",
  "Total Orders_31331_1774643475.csv",
  "Total Orders_31331_1774817200.csv",
  "Total Orders_31331_1774817200 (1).csv",
  "Total Orders_31331_1774817711.csv",
  "Total Orders_31331_1774817946.csv",
  "Total Orders_31331_1774817953.csv",
].map((f) => path.join(CSV_DIR, f));

// Also check Spreadsheets subfolder
const EXTRA = path.join(CSV_DIR, "Spreadsheets", "Account Data", "Total Orders_31331_1773392514.csv");

function parseCSV(content) {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    rows.push(obj);
  }

  return rows;
}

function parseOrderDate(dateStr) {
  // Format: "11-Feb-2026 01:14 PM"
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();

  // Manual parse
  const parts = dateStr.match(/(\d+)-(\w+)-(\d+)\s+(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return null;

  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  let hour = parseInt(parts[4]);
  const ampm = parts[6].toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const date = new Date(parseInt(parts[3]), months[parts[2]], parseInt(parts[1]), hour, parseInt(parts[5]));
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function extractPaymentType(paymentStr) {
  if (!paymentStr) return "unknown";
  const s = paymentStr.toLowerCase();
  if (s.includes("talabat")) return "talabat";
  if (s.includes("network") || s.includes("pos") || s.includes("visa") || s.includes("card")) return "card";
  if (s.includes("cash")) return "cash";
  if (s.includes("link")) return "card";
  return "other";
}

async function main() {
  // Track order numbers to avoid duplicates across files
  const seenOrders = new Set();
  let totalImported = 0;
  let totalSkipped = 0;

  const allFiles = [...CSV_FILES];
  if (fs.existsSync(EXTRA)) allFiles.push(EXTRA);

  for (const filePath of allFiles) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${path.basename(filePath)}`);
      continue;
    }

    console.log(`\n=== ${path.basename(filePath)} ===`);
    const content = fs.readFileSync(filePath, "utf-8");
    const rows = parseCSV(content);
    console.log(`  Parsed: ${rows.length} rows`);

    const batch = [];

    for (const row of rows) {
      const orderNo = row["Order No"] || row["order_no"] || "";
      if (!orderNo || seenOrders.has(orderNo)) {
        totalSkipped++;
        continue;
      }
      seenOrders.add(orderNo);

      const datetime = parseOrderDate(row["Order Time"] || row["order_time"] || "");
      if (!datetime) {
        totalSkipped++;
        continue;
      }

      const amount = parseFloat(row["Order Amount"] || row["order_amount"] || "0");
      if (amount <= 0) {
        totalSkipped++;
        continue;
      }

      const paymentType = extractPaymentType(row["Payments"] || row["payments"] || "");
      const status = (row["Status"] || row["status"] || "Paid").toLowerCase() === "paid" ? "completed" : "cancelled";
      const notes = row["Notes"] || row["notes"] || null;

      batch.push({
        order_no: orderNo,
        datetime,
        amount,
        payment_type: paymentType,
        status,
        notes: notes || null,
      });
    }

    // Insert in batches of 100
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      const { error } = await supabase.from("orders_history").insert(chunk);
      if (error) {
        console.log(`  Error batch ${i}: ${error.message}`);
      } else {
        totalImported += chunk.length;
      }
    }

    console.log(`  Imported: ${batch.length} orders`);
  }

  console.log(`\n=== DONE === Total imported: ${totalImported}, Skipped/dupes: ${totalSkipped}`);

  // Summary
  const { data: countData } = await supabase.from("orders_history").select("id", { count: "exact", head: true });
  console.log(`Total orders in DB: check Supabase`);
}

main().catch(console.error);
