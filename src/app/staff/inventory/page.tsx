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
}

const TABS: { value: InventoryType; en: string; fil: string }[] = [
  { value: "grocery", en: "Grocery", fil: "Grocery" },
  { value: "packaging", en: "Packaging", fil: "Packaging" },
  { value: "kitchen", en: "Kitchen", fil: "Kitchen" },
];

export default function StaffInventory() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  const [tab, setTab] = useState<InventoryType>("grocery");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showOnly, setShowOnly] = useState<"all" | "alert">("all");
  const [successId, setSuccessId] = useState<string | null>(null);

  const t = lang === "en"
    ? { title: "Inventory", search: "Search...", update: "Save", noItems: "No items", alerts: "Alerts", all: "All", updated: "Saved!", items: "items" }
    : { title: "Imbentaryo", search: "Hanapin...", update: "I-save", noItems: "Wala", alerts: "Alerto", all: "Lahat", updated: "Na-save!", items: "bagay" };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: tab });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
      setSuccessId(item.id);
      setTimeout(() => setSuccessId(null), 1500);
      fetchItems();
    } catch { /* */ }
    setUpdating(null);
  }

  // Filter & group
  const filtered = showOnly === "alert"
    ? items.filter((i) => i.status === "out" || i.status === "low")
    : items;

  const grouped: Record<string, InventoryItem[]> = {};
  filtered.forEach((i) => {
    const cat = i.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  const alertCount = items.filter((i) => i.status === "out" || i.status === "low").length;

  function toggleCategory(cat: string) {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  const statusDot = (s: string) =>
    s === "out" ? "bg-danger" : s === "low" ? "bg-warning" : "bg-success";

  return (
    <div className="space-y-3 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-staff-text font-[family-name:var(--font-cairo)]">
          {t.title}
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
        {TABS.map((tb) => (
          <button
            key={tb.value}
            onClick={() => { setTab(tb.value); setSearch(""); setShowOnly("all"); }}
            className={`flex-1 px-2 py-2 text-sm font-medium ${
              tab === tb.value ? "bg-teal text-white" : "text-staff-text2"
            }`}
          >
            {lang === "en" ? tb.en : tb.fil}
          </button>
        ))}
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="flex-1 px-3 py-2 rounded-lg border border-staff-border bg-staff-card text-staff-text text-sm"
        />
        <button
          onClick={() => setShowOnly(showOnly === "all" ? "alert" : "all")}
          className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap ${
            showOnly === "alert"
              ? "bg-danger/10 text-danger border-danger/30"
              : "bg-staff-card text-staff-text2 border-staff-border"
          }`}
        >
          {showOnly === "alert" ? `${t.alerts} (${alertCount})` : alertCount > 0 ? `⚠️ ${alertCount}` : t.all}
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 text-xs text-staff-text2">
        <span>{filtered.length} {t.items}</span>
        <span className="text-danger">{items.filter(i => i.status === "out").length} out</span>
        <span className="text-warning">{items.filter(i => i.status === "low").length} low</span>
        <span className="text-success">{items.filter(i => i.status === "ok").length} ok</span>
      </div>

      {/* Items grouped by category */}
      {loading ? (
        <p className="text-center text-staff-text2 py-8">Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-center text-staff-text2 py-8">{t.noItems}</p>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => {
          const isCollapsed = collapsed[cat];
          const catAlerts = catItems.filter((i) => i.status !== "ok").length;

          return (
            <div key={cat}>
              {/* Category header — tap to collapse */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between py-2 px-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-staff-text2">{isCollapsed ? "▶" : "▼"}</span>
                  <span className="text-sm font-semibold text-staff-text">{cat}</span>
                  <span className="text-xs text-staff-text2">({catItems.length})</span>
                </div>
                {catAlerts > 0 && (
                  <span className="text-xs bg-danger/10 text-danger px-1.5 py-0.5 rounded">
                    {catAlerts} alert{catAlerts > 1 ? "s" : ""}
                  </span>
                )}
              </button>

              {/* Items — compact rows */}
              {!isCollapsed && (
                <div className="bg-staff-card rounded-xl border border-staff-border overflow-hidden mb-2">
                  {catItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 px-3 py-2 ${
                        idx < catItems.length - 1 ? "border-b border-staff-border/50" : ""
                      } ${successId === item.id ? "bg-success/5" : ""}`}
                    >
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(item.status)}`} />

                      {/* Name + current qty */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-staff-text truncate block">{item.name}</span>
                      </div>

                      {/* Current qty */}
                      <span className={`text-sm font-bold min-w-8 text-right ${
                        item.status === "out" ? "text-danger" : item.status === "low" ? "text-warning" : "text-staff-text"
                      }`}>
                        {item.qty}
                      </span>
                      <span className="text-[10px] text-staff-text2 w-6">{item.unit}</span>

                      {/* Quick update */}
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        inputMode="decimal"
                        value={editQty[item.id] || ""}
                        onChange={(e) =>
                          setEditQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="—"
                        className="w-14 px-1.5 py-1 rounded border border-staff-border bg-staff-bg text-staff-text text-sm text-center"
                      />
                      <button
                        onClick={() => updateCount(item)}
                        disabled={!editQty[item.id] || updating === item.id}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          successId === item.id
                            ? "bg-success/20 text-success"
                            : "bg-teal text-white disabled:opacity-30"
                        }`}
                      >
                        {successId === item.id ? "✓" : updating === item.id ? "..." : t.update}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
