"use client";

import { useState, useEffect, useCallback } from "react";

interface ProductionEntry {
  id: string;
  date: string;
  item: string;
  quantity: number;
  unit: string;
  staff_name: string;
  notes: string | null;
}

const PRODUCTION_ITEMS = [
  "Samosa",
  "Spring Rolls",
  "Volcano Rolls",
  "Malfoof (Wrapped)",
  "Grape Leaves (Wrapped)",
  "Kousa (Wrapped)",
  "Onion (Wrapped)",
  "Other",
];

export default function StaffProduction() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  const [item, setItem] = useState(PRODUCTION_ITEMS[0]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);

  const t = {
    en: {
      title: "Production Log",
      item: "Item",
      quantity: "Quantity",
      unit: "Unit",
      notes: "Notes (optional)",
      log: "Log Production",
      logging: "Logging...",
      logged: "Logged!",
      recent: "Today's Production",
      noEntries: "No production logged today",
    },
    fil: {
      title: "Log ng Produksyon",
      item: "Bagay",
      quantity: "Dami",
      unit: "Yunit",
      notes: "Mga Tala (opsyonal)",
      log: "I-log ang Produksyon",
      logging: "Naglo-log...",
      logged: "Na-log!",
      recent: "Produksyon Ngayon",
      noEntries: "Walang na-log ngayong araw",
    },
  };
  const tx = t[lang];

  const today = new Date().toISOString().split("T")[0];

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/production?from=${today}&to=${today}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      // silently fail
    }
  }, [today]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    setLoading(true);

    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          item,
          quantity: parseFloat(quantity),
          unit,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setQuantity("");
        setNotes("");
        fetchEntries();
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-staff-text font-[family-name:var(--font-cairo)]">
          {tx.title}
        </h2>
        <button
          onClick={() => setLang(lang === "en" ? "fil" : "en")}
          className="text-xs px-2 py-1 rounded bg-staff-bg border border-staff-border text-staff-text2"
        >
          {lang === "en" ? "FIL" : "EN"}
        </button>
      </div>

      {success && (
        <div className="bg-success/10 border border-success/30 text-success rounded-xl p-3 text-center font-medium">
          {tx.logged}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="bg-staff-card rounded-xl border border-staff-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.item}
            </label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text"
            >
              {PRODUCTION_ITEMS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-staff-text2 mb-1">
                {tx.quantity}
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-lg"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-staff-text2 mb-1">
                {tx.unit}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text"
              >
                <option value="pcs">pcs</option>
                <option value="boxes">boxes</option>
                <option value="trays">trays</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.notes}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !quantity}
          className="w-full py-3 rounded-xl bg-teal text-white font-semibold text-lg hover:bg-teal-dark transition-colors disabled:opacity-40"
        >
          {loading ? tx.logging : tx.log}
        </button>
      </form>

      {/* Today's Production */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-staff-text2 mb-2">{tx.recent}</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-staff-text2">{tx.noEntries}</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-staff-card rounded-lg border border-staff-border p-3 flex justify-between items-center"
              >
                <div>
                  <span className="font-medium text-staff-text text-sm">
                    {entry.item}
                  </span>
                  <span className="text-xs text-staff-text2 ml-2">
                    by {entry.staff_name}
                  </span>
                  {entry.notes && (
                    <p className="text-xs text-staff-text2 mt-0.5">{entry.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-teal">{entry.quantity}</span>
                  <span className="text-xs text-staff-text2 ml-1">{entry.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
