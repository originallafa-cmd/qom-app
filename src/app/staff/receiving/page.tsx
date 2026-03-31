"use client";

import { useState } from "react";

interface DeliveryItem {
  _key: string;
  name: string;
  qty: string;
  unit: string;
}

export default function StaffReceiving() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([
    { _key: crypto.randomUUID(), name: "", qty: "", unit: "pcs" },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const t = {
    en: {
      title: "Receiving / Deliveries",
      supplier: "Supplier Name",
      items: "Items Received",
      name: "Item Name",
      qty: "Qty",
      unit: "Unit",
      addItem: "+ Add Item",
      notes: "Notes (optional)",
      submit: "Log Delivery",
      submitting: "Logging...",
      logged: "Delivery logged!",
    },
    fil: {
      title: "Pagtanggap / Deliveries",
      supplier: "Pangalan ng Supplier",
      items: "Mga Natanggap",
      name: "Pangalan",
      qty: "Dami",
      unit: "Yunit",
      addItem: "+ Dagdagan",
      notes: "Mga Tala (opsyonal)",
      submit: "I-log ang Delivery",
      submitting: "Naglo-log...",
      logged: "Na-log ang delivery!",
    },
  };
  const tx = t[lang];

  function addItem() {
    setItems([...items, { _key: crypto.randomUUID(), name: "", qty: "", unit: "pcs" }]);
  }

  function updateItem(i: number, field: keyof DeliveryItem, value: string) {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  }

  function removeItem(i: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier || items.every((i) => !i.name)) return;
    setLoading(true);

    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier,
          items_json: items
            .filter((i) => i.name)
            .map((i) => ({
              name: i.name,
              qty: parseFloat(i.qty) || 0,
              unit: i.unit,
            })),
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setSupplier("");
        setItems([{ _key: crypto.randomUUID(), name: "", qty: "", unit: "pcs" }]);
        setNotes("");
        setTimeout(() => setSuccess(false), 3000);
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
        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <label className="block text-sm font-medium text-staff-text2 mb-1">
            {tx.supplier}
          </label>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text"
          />
        </div>

        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <h3 className="font-semibold text-staff-text mb-3">{tx.items}</h3>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={item._key} className="flex gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  placeholder={tx.name}
                  className="flex-1 px-2 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
                />
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateItem(i, "qty", e.target.value)}
                  placeholder={tx.qty}
                  className="w-16 px-2 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(i, "unit", e.target.value)}
                  className="w-20 px-1 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-xs"
                >
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="boxes">boxes</option>
                  <option value="bags">bags</option>
                  <option value="bottles">bottles</option>
                </select>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-danger text-lg px-1">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-sm text-teal font-medium">
            {tx.addItem}
          </button>
        </div>

        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <label className="block text-sm font-medium text-staff-text2 mb-1">{tx.notes}</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !supplier}
          className="w-full py-3 rounded-xl bg-teal text-white font-semibold text-lg hover:bg-teal-dark transition-colors disabled:opacity-40"
        >
          {loading ? tx.submitting : tx.submit}
        </button>
      </form>
    </div>
  );
}
