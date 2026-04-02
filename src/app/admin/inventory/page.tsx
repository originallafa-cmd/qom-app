"use client";

import { useState, useEffect, useCallback } from "react";
import { exportToExcel } from "@/lib/export-xlsx";

type InventoryType = "grocery" | "packaging" | "kitchen";

interface InventoryItem {
  id: string;
  name: string;
  type: InventoryType;
  category: string | null;
  qty: number;
  unit: string;
  reorder_at: number;
  usage_rate: number;
  usage_period: string;
  time_remaining: number;
  status: "ok" | "low" | "out";
  priority: string;
  supplier: string | null;
  notes: string | null;
  updated_at: string;
  last_counted_by?: string;
  last_counted_at?: string;
}

const TABS: { value: InventoryType; label: string; count?: number }[] = [
  { value: "grocery", label: "Grocery" },
  { value: "packaging", label: "Packaging" },
  { value: "kitchen", label: "Kitchen / Frozen" },
];

export default function AdminInventory() {
  const [tab, setTab] = useState<InventoryType>("grocery");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ grocery: 0, packaging: 0, kitchen: 0 });

  // Add form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newReorder, setNewReorder] = useState("");
  const [newUsageRate, setNewUsageRate] = useState("");
  const [newUsagePeriod, setNewUsagePeriod] = useState("weekly");
  const [newSupplier, setNewSupplier] = useState("");
  const [newPriority, setNewPriority] = useState("normal");

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

  // Fetch counts for all tabs — single request
  useEffect(() => {
    fetch("/api/inventory/counts")
      .then((r) => r.json())
      .then((data) => { if (data.grocery !== undefined) setCounts(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  }

  async function addItem() {
    if (!newName) return;
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        type: tab,
        category: newCategory || null,
        qty: parseFloat(newQty) || 0,
        unit: newUnit,
        reorder_at: parseFloat(newReorder) || 0,
        usage_rate: parseFloat(newUsageRate) || 0,
        usage_period: newUsagePeriod,
        supplier: newSupplier || null,
        priority: newPriority,
      }),
    });
    if (res.ok) { showFeedback("success", `${newName} added`); } else { showFeedback("error", "Failed to add"); }
    setShowAdd(false);
    resetAddForm();
    fetchItems();
  }

  function resetAddForm() {
    setNewName("");
    setNewCategory("");
    setNewQty("");
    setNewUnit("pcs");
    setNewReorder("");
    setNewUsageRate("");
    setNewUsagePeriod("weekly");
    setNewSupplier("");
    setNewPriority("normal");
  }

  async function updateItem(id: string, updates: Partial<InventoryItem>) {
    const res = await fetch(`/api/inventory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) { showFeedback("success", "Updated"); } else { showFeedback("error", "Update failed"); }
    setEditingId(null);
    fetchItems();
  }

  async function deleteItem(id: string) {
    if (!confirm("Are you sure you want to delete this item? This cannot be undone.")) return;
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    if (res.ok) { showFeedback("success", "Deleted"); } else { showFeedback("error", "Delete failed"); }
    fetchItems();
  }

  const statusBadge = (s: string) => {
    if (s === "out") return "bg-danger/10 text-danger";
    if (s === "low") return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  const alertCounts = items.reduce(
    (acc, i) => {
      if (i.status === "out") acc.out++;
      if (i.status === "low") acc.low++;
      return acc;
    },
    { out: 0, low: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
            Inventory Management
          </h1>
          {(alertCounts.out > 0 || alertCounts.low > 0) && (
            <p className="text-sm text-admin-text3">
              <span className="text-danger">{alertCounts.out} out of stock</span>
              {" · "}
              <span className="text-warning">{alertCounts.low} low stock</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (items.length === 0) return;
              exportToExcel(items.map((i) => ({
                Name: i.name, Type: i.type, Category: i.category || "", Qty: i.qty, Unit: i.unit,
                "Reorder At": i.reorder_at, Status: i.status, "Usage Rate": i.usage_rate,
                "Usage Period": i.usage_period, "Time Left": i.time_remaining, Priority: i.priority,
                Supplier: i.supplier || "", Notes: i.notes || "",
              })), `QoM_Inventory_${tab}_${new Date().toISOString().split("T")[0]}`);
            }}
            disabled={items.length === 0}
            className="px-4 py-2 bg-admin-card border border-admin-border text-admin-text2 rounded-lg text-sm font-medium hover:text-admin-text disabled:opacity-40"
          >
            Export
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-admin-card rounded-lg border border-admin-border overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${
              tab === t.value
                ? "bg-teal text-white"
                : "text-admin-text2 hover:bg-admin-card-hover"
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs opacity-70">({counts[t.value]})</span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg px-4 py-2 text-sm font-medium ${feedback.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
          {feedback.msg}
        </div>
      )}

      {/* Search */}
      <label className="sr-only" htmlFor="inv-search">Search items</label>
      <input
        id="inv-search"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items..."
        className="w-full px-4 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm"
      />

      {/* Add Item Form */}
      {showAdd && (
        <div className="bg-admin-card rounded-xl border border-teal/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-teal">Add New Item to {tab}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="block text-[10px] text-admin-text3 mb-1">Name *</label><input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Category</label><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Qty</label><input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Unit</label><select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
              <option value="pcs">pcs</option><option value="kg">kg</option><option value="boxes">boxes</option><option value="bags">bags</option><option value="bottles">bottles</option><option value="cans">cans</option><option value="packets">packets</option><option value="liters">liters</option><option value="rolls">rolls</option><option value="trays">trays</option>
            </select></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Reorder at</label><input type="number" value={newReorder} onChange={(e) => setNewReorder(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Usage rate</label><input type="number" value={newUsageRate} onChange={(e) => setNewUsageRate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Usage period</label><select value={newUsagePeriod} onChange={(e) => setNewUsagePeriod(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
              <option value="weekly">Per week</option><option value="daily">Per day</option>
            </select></div>
            <div><label className="block text-[10px] text-admin-text3 mb-1">Priority</label><select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
              <option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
            </select></div>
            <input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Supplier" className="px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} disabled={!newName} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium disabled:opacity-40">Save</button>
            <button onClick={() => { setShowAdd(false); resetAddForm(); }} className="px-4 py-2 bg-admin-bg text-admin-text2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-admin-text2">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-admin-text3">No items in {tab}. Add some!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left text-admin-text3 font-medium">Name</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Category</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Qty</th>
                  <th className="px-3 py-3 text-center text-admin-text3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Reorder</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Usage</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Time Left</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Supplier</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Last Count</th>
                  <th className="px-3 py-3 text-center text-admin-text3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-admin-border/50 hover:bg-admin-card-hover">
                    <td className="px-4 py-2.5 text-admin-text font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-admin-text2">{item.category || "—"}</td>
                    <td className="px-3 py-2.5 text-right text-admin-text">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          defaultValue={item.qty}
                          className="w-16 px-1 py-0.5 rounded bg-admin-bg border border-admin-border text-admin-text text-sm text-right"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateItem(item.id, { qty: parseFloat((e.target as HTMLInputElement).value) });
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span>
                          {item.qty} <span className="text-admin-text3 text-xs">{item.unit}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadge(item.status)}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-admin-text2">{item.reorder_at}</td>
                    <td className="px-3 py-2.5 text-right text-admin-text2">
                      {item.usage_rate > 0 ? `${item.usage_rate}/${item.usage_period === "daily" ? "day" : "wk"}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-admin-text2">
                      {item.time_remaining > 0
                        ? `${item.time_remaining.toFixed(1)} ${item.usage_period === "daily" ? "days" : "wks"}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-admin-text2 text-xs">{item.supplier || "—"}</td>
                    <td className="px-3 py-2.5 text-admin-text3 text-[10px]">
                      {item.last_counted_at
                        ? `${new Date(item.last_counted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} by ${item.last_counted_by}`
                        : "Never"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                          className="text-xs text-teal hover:underline"
                        >
                          {editingId === item.id ? "Cancel" : "Edit"}
                        </button>
                        <span className="text-admin-text3">|</span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
