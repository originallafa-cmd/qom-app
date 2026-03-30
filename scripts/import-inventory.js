// Import inventory from 3 xlsx files into Supabase
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FILES = {
  grocery: "C:\\Users\\PC\\Downloads\\Queen of Mahshi Smart Inventory29March2026 (4) (2) (2).xlsx",
  kitchen: "C:\\Users\\PC\\Downloads\\QoM Kitchen Stock(1).xlsx",
  packaging: "C:\\Users\\PC\\Downloads\\Copy-QoM Packaging Inventory 5.xlsx",
};

function cleanStatus(s) {
  if (!s) return null;
  const str = String(s).toLowerCase().replace(/[^\w\s]/g, "").trim();
  if (str.includes("out") || str.includes("zero")) return "out";
  if (str.includes("low") || str.includes("order")) return "low";
  return "ok";
}

function cleanPriority(p) {
  const n = parseInt(p);
  if (n === 1) return "critical";
  if (n === 2) return "high";
  if (n === 4) return "low";
  return "normal"; // 3 or default
}

async function importGrocery() {
  console.log("=== GROCERY ===");
  const wb = XLSX.readFile(FILES.grocery);
  const ws = wb.Sheets["Inventory"];
  if (!ws) { console.log("No 'Inventory' sheet"); return; }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // Header at index 3: #, CATEGORY, ITEM, QTY ON HAND, REORDER AT, STATUS, ALERT, PRIORITY, NOTES
  const dataRows = rows.slice(4).filter((r) => r[2]); // Filter rows that have ITEM

  let count = 0;
  for (const r of dataRows) {
    const name = String(r[2] || "").trim();
    if (!name) continue;

    const { error } = await supabase.from("inventory_items").insert({
      name,
      type: "grocery",
      category: String(r[1] || "").trim() || null,
      qty: parseFloat(r[3]) || 0,
      unit: "pcs",
      reorder_at: parseFloat(r[4]) || 0,
      usage_rate: 0,
      usage_period: "weekly",
      priority: cleanPriority(r[7]),
      notes: r[8] ? String(r[8]).trim() : null,
    });

    if (error) {
      console.log(`  Error: ${name} — ${error.message}`);
    } else {
      count++;
    }
  }
  console.log(`  Imported: ${count} grocery items`);
}

async function importKitchen() {
  console.log("=== KITCHEN ===");
  const wb = XLSX.readFile(FILES.kitchen);
  const ws = wb.Sheets["Current Stock"];
  if (!ws) { console.log("No 'Current Stock' sheet"); return; }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const dataRows = rows.slice(4).filter((r) => r[2]);

  let count = 0;
  for (const r of dataRows) {
    const name = String(r[2] || "").trim();
    if (!name) continue;

    const { error } = await supabase.from("inventory_items").insert({
      name,
      type: "kitchen",
      category: String(r[1] || "").trim() || null,
      qty: parseFloat(r[3]) || 0,
      unit: String(r[4] || "pcs").trim(),
      reorder_at: parseFloat(r[5]) || 0,
      usage_rate: parseFloat(r[6]) || 0,
      usage_period: "daily",
      priority: cleanPriority(r[10]),
      notes: r[11] ? String(r[11]).trim() : null,
    });

    if (error) {
      console.log(`  Error: ${name} — ${error.message}`);
    } else {
      count++;
    }
  }
  console.log(`  Imported: ${count} kitchen items`);

  // Also import production log
  const plWs = wb.Sheets["Production Log"];
  if (plWs) {
    console.log("  Importing production log...");
    const plRows = XLSX.utils.sheet_to_json(plWs, { header: 1 });
    const plData = plRows.slice(4).filter((r) => r[1]);
    let plCount = 0;

    for (const r of plData) {
      let dateStr;
      if (typeof r[0] === "number") {
        const d = new Date((r[0] - 25569) * 86400 * 1000);
        dateStr = d.toISOString().split("T")[0];
      } else {
        continue;
      }

      const { error } = await supabase.from("production_log").insert({
        date: dateStr,
        item: String(r[1] || "").trim(),
        quantity: parseFloat(r[2]) || 0,
        unit: String(r[3] || "pcs").trim(),
        notes: r[5] ? String(r[5]).trim() : null,
      });

      if (!error) plCount++;
    }
    console.log(`  Imported: ${plCount} production log entries`);
  }
}

async function importPackaging() {
  console.log("=== PACKAGING ===");
  const wb = XLSX.readFile(FILES.packaging);
  const ws = wb.Sheets["Current Stock"];
  if (!ws) { console.log("No 'Current Stock' sheet"); return; }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const dataRows = rows.slice(4).filter((r) => r[2]);

  let count = 0;
  for (const r of dataRows) {
    const name = String(r[2] || "").trim();
    if (!name) continue;

    const { error } = await supabase.from("inventory_items").insert({
      name,
      type: "packaging",
      category: String(r[1] || "").trim() || null,
      qty: parseFloat(r[3]) || 0,
      unit: String(r[4] || "pcs").trim(),
      reorder_at: parseFloat(r[5]) || 0,
      usage_rate: parseFloat(r[6]) || 0,
      usage_period: "weekly",
      priority: cleanPriority(r[10]),
      notes: null,
    });

    if (error) {
      console.log(`  Error: ${name} — ${error.message}`);
    } else {
      count++;
    }
  }
  console.log(`  Imported: ${count} packaging items`);
}

async function main() {
  // Clear existing inventory first
  console.log("Clearing existing inventory...");
  await supabase.from("inventory_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  await importGrocery();
  await importKitchen();
  await importPackaging();

  // Summary
  const { data: counts } = await supabase.from("inventory_items").select("type");
  const summary = {};
  (counts || []).forEach((r) => { summary[r.type] = (summary[r.type] || 0) + 1; });
  console.log("\n=== DONE ===", summary);
}

main().catch(console.error);
