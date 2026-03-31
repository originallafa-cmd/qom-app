"use client";

import { useState, useEffect, useCallback } from "react";
import { formatAED } from "@/lib/utils";
import { exportToExcel, exportMultiSheet } from "@/lib/export-xlsx";

type Tab = "pnl" | "bank" | "equity" | "expenses";

interface PnLData {
  month: string;
  days: number;
  gross: { cash: number; card: number; talabat: number; total: number };
  fees: { card: number; talabat: number; total: number };
  actual: { cash: number; card: number; talabat: number; total: number };
  expenses: { daily: number; fixed: number; total: number; byCategory: Record<string, number> };
  netProfit: number;
}

interface BankTx {
  id: string; date: string; description: string; debit: number; credit: number; balance: number; biz_or_personal: string; category: string; ref_no: string;
}

interface EquityEntry {
  id: string; date: string; type: string; amount: number; description: string; running_total: number;
}

interface MonthlyExpense {
  id: string; month: string; item: string; amount: number; status: string; category: string; notes: string;
}

const EXPENSE_CATEGORIES = ["salaries", "rent", "suppliers", "utilities", "delivery", "packaging", "petty_cash", "other"];

export default function AdminFinancials() {
  const [tab, setTab] = useState<Tab>("pnl");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // P&L
  const [pnl, setPnl] = useState<PnLData | null>(null);

  // Bank
  const [bankTxs, setBankTxs] = useState<BankTx[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [showAddBank, setShowAddBank] = useState(false);
  const [bankForm, setBankForm] = useState({ date: "", description: "", debit: "", credit: "", balance: "", biz_or_personal: "biz", category: "" });

  // Equity
  const [equityEntries, setEquityEntries] = useState<EquityEntry[]>([]);
  const [equityBalance, setEquityBalance] = useState(0);
  const [showAddEquity, setShowAddEquity] = useState(false);
  const [equityForm, setEquityForm] = useState({ type: "personal_from_biz", amount: "", description: "" });

  // Expenses
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ item: "", amount: "", category: "other", status: "pending", notes: "" });

  const fetchPnl = useCallback(async () => {
    const res = await fetch(`/api/financials/pnl?month=${month}`);
    if (res.ok) setPnl(await res.json());
  }, [month]);

  const fetchBank = useCallback(async () => {
    const res = await fetch("/api/financials/bank");
    if (res.ok) {
      const data = await res.json();
      setBankTxs(data.transactions);
      setBankBalance(data.currentBalance);
    }
  }, []);

  const fetchEquity = useCallback(async () => {
    const res = await fetch("/api/financials/equity");
    if (res.ok) {
      const data = await res.json();
      setEquityEntries(data.entries);
      setEquityBalance(data.currentBalance);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch(`/api/financials/expenses?month=${month}`);
    if (res.ok) setExpenses(await res.json());
  }, [month]);

  useEffect(() => {
    if (tab === "pnl") fetchPnl();
    if (tab === "bank") fetchBank();
    if (tab === "equity") fetchEquity();
    if (tab === "expenses") fetchExpenses();
  }, [tab, month, fetchPnl, fetchBank, fetchEquity, fetchExpenses]);

  async function addBankTx() {
    await fetch("/api/financials/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...bankForm,
        debit: parseFloat(bankForm.debit) || 0,
        credit: parseFloat(bankForm.credit) || 0,
        balance: parseFloat(bankForm.balance) || null,
      }),
    });
    setShowAddBank(false);
    setBankForm({ date: "", description: "", debit: "", credit: "", balance: "", biz_or_personal: "biz", category: "" });
    fetchBank();
  }

  async function addEquity() {
    await fetch("/api/financials/equity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...equityForm,
        amount: parseFloat(equityForm.amount) || 0,
      }),
    });
    setShowAddEquity(false);
    setEquityForm({ type: "personal_from_biz", amount: "", description: "" });
    fetchEquity();
  }

  async function addExpense() {
    await fetch("/api/financials/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...expenseForm,
        month,
        amount: parseFloat(expenseForm.amount) || 0,
      }),
    });
    setShowAddExpense(false);
    setExpenseForm({ item: "", amount: "", category: "other", status: "pending", notes: "" });
    fetchExpenses();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">Financials</h1>
          <button
            onClick={() => {
              const sheets = [];
              if (pnl) sheets.push({ name: "P&L", data: [{
                Month: pnl.month, Days: pnl.days,
                "Gross Cash": pnl.gross.cash, "Gross Card": pnl.gross.card, "Gross Talabat": pnl.gross.talabat, "Gross Total": pnl.gross.total,
                "Card Fee": pnl.fees.card, "Talabat Fee": pnl.fees.talabat, "Total Fees": pnl.fees.total,
                "Actual Revenue": pnl.actual.total, "Daily Expenses": pnl.expenses.daily, "Fixed Expenses": pnl.expenses.fixed,
                "Total Expenses": pnl.expenses.total, "Net Profit": pnl.netProfit,
              }]});
              if (bankTxs.length > 0) sheets.push({ name: "Bank", data: bankTxs.map((t) => ({
                Date: t.date, Description: t.description, Type: t.biz_or_personal, Debit: t.debit, Credit: t.credit, Balance: t.balance,
              }))});
              if (equityEntries.length > 0) sheets.push({ name: "Equity", data: equityEntries.map((e) => ({
                Date: e.date, Type: e.type, Amount: e.amount, Description: e.description, "Running Total": e.running_total,
              }))});
              if (expenses.length > 0) sheets.push({ name: "Expenses", data: expenses.map((e) => ({
                Month: e.month, Item: e.item, Amount: e.amount, Category: e.category, Status: e.status, Notes: e.notes,
              }))});
              if (sheets.length > 0) exportMultiSheet(sheets, `QoM_Financials_${month}`);
            }}
            className="px-3 py-1.5 bg-admin-card border border-admin-border text-admin-text2 rounded-lg text-xs font-medium hover:text-admin-text"
          >
            Export All
          </button>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-admin-card rounded-lg border border-admin-border overflow-hidden">
        {([
          { value: "pnl", label: "P&L" },
          { value: "bank", label: "ADCB Bank" },
          { value: "equity", label: "Equity" },
          { value: "expenses", label: "Expenses" },
        ] as { value: Tab; label: string }[]).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${
              tab === t.value ? "bg-teal text-white" : "text-admin-text2 hover:bg-admin-card-hover"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* P&L */}
      {tab === "pnl" && pnl && (
        <div className="space-y-4">
          <div className="bg-admin-card rounded-xl border border-admin-border p-5">
            <h3 className="text-sm font-semibold text-admin-text2 mb-4">Profit & Loss — {pnl.month} ({pnl.days} days)</h3>
            <div className="space-y-3">
              <PnlRow label="Gross Revenue" value={pnl.gross.total} bold color="text-admin-text" />
              <div className="pl-4 space-y-1">
                <PnlRow label="Cash (100%)" value={pnl.gross.cash} sub />
                <PnlRow label={`Card (gross) — fee ${formatAED(pnl.fees.card)}`} value={pnl.gross.card} sub />
                <PnlRow label={`Talabat (gross) — fee ${formatAED(pnl.fees.talabat)}`} value={pnl.gross.talabat} sub />
              </div>
              <div className="border-t border-admin-border pt-2">
                <PnlRow label="Total Fees Lost" value={-pnl.fees.total} color="text-danger" />
              </div>
              <PnlRow label="Actual Revenue (after fees)" value={pnl.actual.total} bold color="text-teal" />
              <div className="border-t border-admin-border pt-2">
                <PnlRow label="Daily Expenses (petty cash)" value={-pnl.expenses.daily} color="text-danger" />
                <PnlRow label="Fixed Expenses (monthly)" value={-pnl.expenses.fixed} color="text-danger" />
                <PnlRow label="Total Expenses" value={-pnl.expenses.total} bold color="text-danger" />
              </div>
              <div className="border-t-2 border-admin-border pt-3">
                <PnlRow
                  label="NET PROFIT"
                  value={pnl.netProfit}
                  bold
                  color={pnl.netProfit >= 0 ? "text-success" : "text-danger"}
                />
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          {Object.keys(pnl.expenses.byCategory).length > 0 && (
            <div className="bg-admin-card rounded-xl border border-admin-border p-5">
              <h3 className="text-sm font-semibold text-admin-text2 mb-3">Fixed Expenses by Category</h3>
              {Object.entries(pnl.expenses.byCategory).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm py-1">
                  <span className="text-admin-text2 capitalize">{cat.replace("_", " ")}</span>
                  <span className="text-admin-text">{formatAED(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank */}
      {tab === "bank" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-admin-card rounded-xl border border-admin-border p-4">
              <p className="text-xs text-admin-text3">ADCB Balance</p>
              <p className="text-2xl font-bold text-info">{formatAED(bankBalance)}</p>
            </div>
            <button onClick={() => setShowAddBank(!showAddBank)} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">
              + Add Transaction
            </button>
          </div>

          {showAddBank && (
            <div className="bg-admin-card rounded-xl border border-teal/30 p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="block text-[10px] text-admin-text3 mb-1">Date</label><input type="date" value={bankForm.date} onChange={(e) => setBankForm({ ...bankForm, date: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <div className="col-span-2"><label className="block text-[10px] text-admin-text3 mb-1">Description</label><input value={bankForm.description} onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Type</label><select value={bankForm.biz_or_personal} onChange={(e) => setBankForm({ ...bankForm, biz_or_personal: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
                <option value="biz">Business</option><option value="personal">Personal</option>
              </select></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Debit</label><input type="number" value={bankForm.debit} onChange={(e) => setBankForm({ ...bankForm, debit: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Credit</label><input type="number" value={bankForm.credit} onChange={(e) => setBankForm({ ...bankForm, credit: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Balance after</label><input type="number" value={bankForm.balance} onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <button onClick={addBankTx} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          )}

          <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left text-admin-text3 font-medium">Date</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Description</th>
                  <th className="px-3 py-3 text-center text-admin-text3 font-medium">Type</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Debit</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Credit</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {bankTxs.map((tx) => (
                  <tr key={tx.id} className="border-b border-admin-border/50 hover:bg-admin-card-hover">
                    <td className="px-4 py-2.5 text-admin-text">{tx.date}</td>
                    <td className="px-3 py-2.5 text-admin-text2">{tx.description}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${tx.biz_or_personal === "biz" ? "bg-teal/10 text-teal" : "bg-gold/10 text-gold"}`}>
                        {tx.biz_or_personal}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-danger">{tx.debit > 0 ? formatAED(tx.debit) : ""}</td>
                    <td className="px-3 py-2.5 text-right text-success">{tx.credit > 0 ? formatAED(tx.credit) : ""}</td>
                    <td className="px-3 py-2.5 text-right text-admin-text font-medium">{tx.balance ? formatAED(tx.balance) : "—"}</td>
                  </tr>
                ))}
                {bankTxs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-admin-text3">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equity */}
      {tab === "equity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-admin-card rounded-xl border border-admin-border p-4">
              <p className="text-xs text-admin-text3">Equity Balance</p>
              <p className={`text-2xl font-bold ${equityBalance === 0 ? "text-success" : "text-gold"}`}>
                {formatAED(equityBalance)}
              </p>
              <p className="text-xs text-admin-text3">Ahmed&apos;s 50%: {formatAED(equityBalance * 0.5)}</p>
            </div>
            <button onClick={() => setShowAddEquity(!showAddEquity)} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">
              + Add Entry
            </button>
          </div>

          {showAddEquity && (
            <div className="bg-admin-card rounded-xl border border-teal/30 p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[10px] text-admin-text3 mb-1">Type</label><select value={equityForm.type} onChange={(e) => setEquityForm({ ...equityForm, type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
                  <option value="personal_from_biz">Personal from Biz (takes)</option>
                  <option value="personal_into_biz">Personal into Biz (repays)</option>
                  <option value="adjustment">Adjustment</option>
                </select></div>
                <div><label className="block text-[10px] text-admin-text3 mb-1">Amount</label><input type="number" value={equityForm.amount} onChange={(e) => setEquityForm({ ...equityForm, amount: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
                <div><label className="block text-[10px] text-admin-text3 mb-1">Description</label><input value={equityForm.description} onChange={(e) => setEquityForm({ ...equityForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              </div>
              <button onClick={addEquity} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          )}

          <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left text-admin-text3 font-medium">Date</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Type</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Amount</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Description</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Running Total</th>
                </tr>
              </thead>
              <tbody>
                {equityEntries.map((e) => (
                  <tr key={e.id} className="border-b border-admin-border/50 hover:bg-admin-card-hover">
                    <td className="px-4 py-2.5 text-admin-text">{e.date}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        e.type === "personal_from_biz" ? "bg-danger/10 text-danger" :
                        e.type === "personal_into_biz" ? "bg-success/10 text-success" :
                        "bg-info/10 text-info"
                      }`}>
                        {e.type === "personal_from_biz" ? "From Biz" : e.type === "personal_into_biz" ? "Into Biz" : "Adjust"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-admin-text">{formatAED(e.amount)}</td>
                    <td className="px-3 py-2.5 text-admin-text2">{e.description || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-gold">{formatAED(e.running_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-admin-text2">
              Total: <span className="text-admin-text font-bold">{formatAED(expenses.reduce((s, e) => s + e.amount, 0))}</span>
            </p>
            <button onClick={() => setShowAddExpense(!showAddExpense)} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">
              + Add Expense
            </button>
          </div>

          {showAddExpense && (
            <div className="bg-admin-card rounded-xl border border-teal/30 p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="col-span-2"><label className="block text-[10px] text-admin-text3 mb-1">Item / Description</label><input value={expenseForm.item} onChange={(e) => setExpenseForm({ ...expenseForm, item: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Amount</label><input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" /></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Category</label><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace("_", " ")}</option>
                ))}
              </select></div>
              <div><label className="block text-[10px] text-admin-text3 mb-1">Status</label><select value={expenseForm.status} onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
                <option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
              </select></div>
              <input value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} placeholder="Notes" className="px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm col-span-2" />
              <button onClick={addExpense} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          )}

          <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left text-admin-text3 font-medium">Item</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Category</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Amount</th>
                  <th className="px-3 py-3 text-center text-admin-text3 font-medium">Status</th>
                  <th className="px-3 py-3 text-left text-admin-text3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-admin-border/50 hover:bg-admin-card-hover">
                    <td className="px-4 py-2.5 text-admin-text">{e.item}</td>
                    <td className="px-3 py-2.5 text-admin-text2 capitalize">{e.category.replace("_", " ")}</td>
                    <td className="px-3 py-2.5 text-right text-admin-text font-medium">{formatAED(e.amount)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        e.status === "paid" ? "bg-success/10 text-success" :
                        e.status === "overdue" ? "bg-danger/10 text-danger" :
                        "bg-warning/10 text-warning"
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-admin-text3 text-xs">{e.notes || "—"}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-admin-text3">No expenses for {month}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PnlRow({ label, value, bold, color, sub }: { label: string; value: number; bold?: boolean; color?: string; sub?: boolean }) {
  return (
    <div className={`flex justify-between ${sub ? "text-xs" : "text-sm"} py-0.5`}>
      <span className={sub ? "text-admin-text3" : "text-admin-text2"}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${color || "text-admin-text"}`}>
        {value < 0 ? "-" : ""}{formatAED(Math.abs(value))}
      </span>
    </div>
  );
}
