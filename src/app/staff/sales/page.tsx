"use client";

import { useState, useEffect, useCallback } from "react";

interface ExpenseRow {
  _key: string;
  description: string;
  amount: string;
  category: string;
}

interface RecentEntry {
  id: string;
  date: string;
  total: number;
  cash: number;
  card: number;
  talabat: number;
  expenses: number;
  net: number;
  staff_name: string;
}

const CATEGORIES = [
  { value: "vegetables", en: "Vegetables", fil: "Gulay" },
  { value: "bread", en: "Bread", fil: "Tinapay" },
  { value: "drinks", en: "Drinks", fil: "Inumin" },
  { value: "cleaning", en: "Cleaning", fil: "Panlinis" },
  { value: "other", en: "Other", fil: "Iba pa" },
];

export default function StaffSalesEntry() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  // Business day: before 2 AM counts as yesterday
  const [date, setDate] = useState(() => {
    const now = new Date();
    if (now.getHours() < 2) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split("T")[0];
    }
    return now.toISOString().split("T")[0];
  });
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [talabat, setTalabat] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [ptCash, setPtCash] = useState("");
  const [notes, setNotes] = useState("");
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
    { _key: crypto.randomUUID(), description: "", amount: "", category: "vegetables" },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const t = {
    en: {
      title: "Daily Sales Entry",
      date: "Date",
      cash: "Cash Sales (AED)",
      card: "Card Sales (AED)",
      cardHint: "POS + Link + Visa + Transfer",
      talabat: "Talabat Sales (AED)",
      opening: "Opening Cash (AED)",
      ptCash: "PT Cash Top-up (from Mohamed)",
      expenses: "Expenses",
      addExpense: "+ Add Expense",
      description: "Description",
      amount: "Amount",
      category: "Category",
      notes: "Notes (problems only)",
      notesHint: "Voids, refunds, missing cash only",
      total: "Total Sales",
      totalExpenses: "Total Expenses",
      net: "Net",
      closing: "Closing Cash",
      submit: "Submit Daily Sales",
      submitting: "Submitting...",
      submitted: "Submitted successfully!",
      recent: "Recent Entries",
      hideRecent: "Hide",
    },
    fil: {
      title: "Benta ng Araw",
      date: "Petsa",
      cash: "Cash Sales (AED)",
      card: "Card Sales (AED)",
      cardHint: "POS + Link + Visa + Transfer",
      talabat: "Talabat Sales (AED)",
      opening: "Panimulang Cash (AED)",
      ptCash: "PT Cash Top-up (mula kay Mohamed)",
      expenses: "Mga Gastos",
      addExpense: "+ Dagdagan ang Gastos",
      description: "Paglalarawan",
      amount: "Halaga",
      category: "Kategorya",
      notes: "Mga Tala (problema lang)",
      notesHint: "Void, refund, kulang na cash lang",
      total: "Kabuuang Benta",
      totalExpenses: "Kabuuang Gastos",
      net: "Net",
      closing: "Panghuling Cash",
      submit: "Isumite ang Benta",
      submitting: "Nagsusumite...",
      submitted: "Matagumpay na naisumite!",
      recent: "Mga Kamakailang Entry",
      hideRecent: "Itago",
    },
  };

  const tx = t[lang];

  // Calculations
  const numCash = parseFloat(cash) || 0;
  const numCard = parseFloat(card) || 0;
  const numTalabat = parseFloat(talabat) || 0;
  const numOpening = parseFloat(openingCash) || 0;
  const numPtCash = parseFloat(ptCash) || 0;
  const totalSales = numCash + numCard + numTalabat;
  const totalExpenses = expenseRows.reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0
  );
  const netSales = totalSales - totalExpenses;
  const closingCash = numOpening + numCash - totalExpenses + numPtCash;

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/recent");
      if (res.ok) {
        const data = await res.json();
        setRecentEntries(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  function addExpenseRow() {
    setExpenseRows([
      ...expenseRows,
      { _key: crypto.randomUUID(), description: "", amount: "", category: "vegetables" },
    ]);
  }

  function updateExpenseRow(index: number, field: keyof ExpenseRow, value: string) {
    const updated = [...expenseRows];
    updated[index] = { ...updated[index], [field]: value };
    setExpenseRows(updated);
  }

  function removeExpenseRow(index: number) {
    if (expenseRows.length === 1) return;
    setExpenseRows(expenseRows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const payload = {
        date,
        cash: numCash,
        card: numCard,
        talabat: numTalabat,
        opening_cash: numOpening,
        pt_cash: numPtCash,
        notes: notes || null,
        expense_items: expenseRows
          .filter((r) => r.description && parseFloat(r.amount) > 0)
          .map((r) => ({
            description: r.description,
            amount: parseFloat(r.amount),
            category: r.category,
          })),
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        // Entry already exists — ask to confirm update
        const data = await res.json();
        const confirmMsg = lang === "en"
          ? `${data.message}\n\nDo you want to update it?`
          : `May sales na para sa ${date} na sinumite ni ${data.submittedBy}. I-update ba?`;

        if (confirm(confirmMsg)) {
          // Resubmit with confirmUpdate flag
          const res2 = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, confirmUpdate: true }),
          });
          if (res2.ok) {
            setSuccess(true);
            setCash(""); setCard(""); setTalabat(""); setPtCash(""); setNotes("");
            setExpenseRows([{ _key: crypto.randomUUID(), description: "", amount: "", category: "vegetables" }]);
            fetchRecent();
            setTimeout(() => setSuccess(false), 3000);
          } else {
            const d = await res2.json();
            setError(d.error || "Failed to update");
          }
        }
        setLoading(false);
        return;
      }

      if (res.ok) {
        setSuccess(true);
        setCash(""); setCard(""); setTalabat(""); setPtCash(""); setNotes("");
        setExpenseRows([{ _key: crypto.randomUUID(), description: "", amount: "", category: "vegetables" }]);
        fetchRecent();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
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
          {tx.submitted}
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <label className="block text-sm font-medium text-staff-text2 mb-1">
            {tx.date}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text"
          />
        </div>

        {/* Sales Inputs */}
        <div className="bg-staff-card rounded-xl border border-staff-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.cash}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.card}
            </label>
            <p className="text-xs text-staff-text2 mb-1">{tx.cardHint}</p>
            <input
              type="number"
              step="0.01"
              min="0"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.talabat}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={talabat}
              onChange={(e) => setTalabat(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-lg"
            />
          </div>
        </div>

        {/* Cash Management */}
        <div className="bg-staff-card rounded-xl border border-staff-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.opening}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-staff-text2 mb-1">
              {tx.ptCash}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={ptCash}
              onChange={(e) => setPtCash(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text"
            />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <h3 className="font-semibold text-staff-text mb-3">{tx.expenses}</h3>
          <div className="space-y-3">
            {expenseRows.map((row, i) => (
              <div key={row._key} className="flex gap-2">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateExpenseRow(i, "description", e.target.value)}
                  placeholder={tx.description}
                  className="flex-1 px-2 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.amount}
                  onChange={(e) => updateExpenseRow(i, "amount", e.target.value)}
                  placeholder="AED"
                  className="w-20 px-2 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm"
                />
                <select
                  value={row.category}
                  onChange={(e) => updateExpenseRow(i, "category", e.target.value)}
                  className="w-24 px-1 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {lang === "en" ? c.en : c.fil}
                    </option>
                  ))}
                </select>
                {expenseRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(i)}
                    className="text-danger text-lg px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addExpenseRow}
            className="mt-2 text-sm text-teal font-medium"
          >
            {tx.addExpense}
          </button>
        </div>

        {/* Notes */}
        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <label className="block text-sm font-medium text-staff-text2 mb-1">
            {tx.notes}
          </label>
          <p className="text-xs text-staff-text2 mb-2">{tx.notesHint}</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-staff-border bg-staff-bg text-staff-text text-sm resize-none"
          />
        </div>

        {/* Summary */}
        <div className="bg-teal/5 rounded-xl border border-teal/20 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-staff-text2">{tx.total}</span>
            <span className="font-semibold text-staff-text">
              {totalSales.toFixed(2)} AED
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-staff-text2">{tx.totalExpenses}</span>
            <span className="font-semibold text-danger">
              -{totalExpenses.toFixed(2)} AED
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-staff-border pt-2">
            <span className="text-staff-text2">{tx.net}</span>
            <span className="font-bold text-teal">{netSales.toFixed(2)} AED</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-staff-text2">{tx.closing}</span>
            <span className="font-bold text-gold">{closingCash.toFixed(2)} AED</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || totalSales === 0}
          className="w-full py-3 rounded-xl bg-teal text-white font-semibold text-lg hover:bg-teal-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? tx.submitting : tx.submit}
        </button>
      </form>

      {/* Recent Entries */}
      <div className="mt-6">
        <button
          onClick={() => setShowRecent(!showRecent)}
          className="text-sm text-teal font-medium"
        >
          {showRecent ? tx.hideRecent : tx.recent}
        </button>
        {showRecent && (
          <div className="mt-3 space-y-2">
            {recentEntries.length === 0 ? (
              <p className="text-sm text-staff-text2">No entries yet</p>
            ) : (
              recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-staff-card rounded-lg border border-staff-border p-3 text-sm"
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-staff-text">{entry.date}</span>
                    <span className="font-bold text-teal">
                      {entry.total.toFixed(2)} AED
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-staff-text2">
                    <span>Cash: {entry.cash.toFixed(0)}</span>
                    <span>Card: {entry.card.toFixed(0)}</span>
                    <span>Talabat: {entry.talabat.toFixed(0)}</span>
                    <span>Exp: {entry.expenses.toFixed(0)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
