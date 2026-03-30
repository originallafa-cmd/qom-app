"use client";

import { useState, useEffect, useCallback } from "react";

type InventoryType = "grocery" | "packaging" | "kitchen";

interface InventoryItem {
  id: string;
  name: string;
  type: InventoryType;
  category: string | null;
  qty: number;
  unit: string;
  reorder_at: number;
  status: "ok" | "low" | "out";
  priority: string;
  notes: string | null;
}

const TABS: { value: InventoryType; en: string; fil: string }[] = [
  { value: "grocery", en: "Grocery", fil: "Grocery" },
  { value: "packaging", en: "Packaging", fil: "Packaging" },
  { value: "kitchen", en: "Kitchen / Frozen", fil: "Kitchen / Frozen" },
];

export default function StaffInventory() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  const [tab, setTab] = useState<InventoryType>("grocery");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<Record<string, string>>({});

  const t = {
    en: {
      title: "Inventory Count",
      search: "Search items...",
      qty: "Qty",
      update: "Update",
      unit: "Unit",
      reorder: "Reorder at",
      out: "OUT",
      low: "LOW",
      ok: "OK",
      noItems: "No items found",
      updated: "Updated!",
    },
    fil: {
      title: "Bilang ng Imbentaryo",
      search: "Hanapin...",
      qty: "Dami",
      update: "I-update",
      unit: "Yunit",
      reorder: "Mag-order sa",
      out: "UBOS",
      low: "MABABA",
      ok: "OK",
      noItems: "Walang nakita",
      updated: "Na-update!",
    },
  };
  const tx = t[lang];

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: tab });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function updateCount(item: InventoryItem) {
    const newQty = parseFloat(editQty[item.id] || "");
    if (isNaN(newQty) || newQty < 0) return;

    setUpdating(item.id);
    try {
      await fetch("/api/inventory/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, qty: newQty }),
      });
      setEditQty((prev) => ({ ...prev, [item.id]: "" }));
      fetchItems();
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  }

  const statusColor = (s: string) => {
    if (s === "out") return "bg-danger/10 text-danger border-danger/30";
    if (s === "low") return "bg-warning/10 text-warning border-warning/30";
    return "bg-success/10 text-success border-success/30";
  };

  const statusLabel = (s: string) => {
    if (s === "out") return tx.out;
    if (s === "low") return tx.low;
    return tx.ok;
  };

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

      {/* Tabs */}
      <div className="flex bg-staff-card rounded-lg border border-staff-border overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium ${
              tab === t.value
                ? "bg-teal text-white"
                : "text-staff-text2 hover:bg-staff-bg"
            }`}
          >
            {lang === "en" ? t.en : t.fil}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={tx.search}
        className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-card text-staff-text text-sm"
      />

      {/* Items List */}
      {loading ? (
        <p className="text-center text-staff-text2 py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-staff-text2 py-8">{tx.noItems}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-staff-card rounded-xl border border-staff-border p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-staff-text text-sm">
                      {item.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor(
                        item.status
                      )}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  {item.category && (
                    <span className="text-xs text-staff-text2">{item.category}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-staff-text">
                    {item.qty}
                  </span>
                  <span className="text-xs text-staff-text2 ml-1">{item.unit}</span>
                </div>
              </div>

              {/* Update Row */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editQty[item.id] || ""}
                  onChange={(e) =>
                    setEditQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder={`New ${tx.qty}`}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
                />
                <button
                  onClick={() => updateCount(item)}
                  disabled={!editQty[item.id] || updating === item.id}
                  className="px-3 py-1.5 rounded-lg bg-teal text-white text-sm font-medium disabled:opacity-40"
                >
                  {updating === item.id ? "..." : tx.update}
                </button>
              </div>

              {/* Reorder info */}
              <div className="flex justify-between mt-1 text-[10px] text-staff-text2">
                <span>
                  {tx.reorder}: {item.reorder_at} {item.unit}
                </span>
                {item.notes && <span>{item.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
