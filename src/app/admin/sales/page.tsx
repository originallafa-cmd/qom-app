"use client";

import { useState, useEffect, useCallback } from "react";
import { formatAED } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type View = "daily" | "weekly" | "monthly";

interface DailyRow {
  id: string;
  date: string;
  cash: number;
  card: number;
  talabat: number;
  total: number;
  expenses: number;
  net: number;
  notes: string | null;
  staff_name: string;
  expense_items: { description: string; amount: number; category: string }[];
}

interface AggRow {
  month?: string;
  weekStart?: string;
  weekEnd?: string;
  days: number;
  cash: number;
  card: number;
  talabat: number;
  total: number;
  expenses: number;
  net: number;
  avgDaily: number;
}

export default function AdminSalesReports() {
  const [view, setView] = useState<View>("daily");
  const [from, setFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  });
  const [rows, setRows] = useState<(DailyRow | AggRow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/admin/sales?${params}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [view, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate totals
  const totals = rows.reduce(
    (acc, r) => ({
      cash: acc.cash + r.cash,
      card: acc.card + r.card,
      talabat: acc.talabat + r.talabat,
      total: acc.total + r.total,
      expenses: acc.expenses + r.expenses,
      net: acc.net + r.net,
    }),
    { cash: 0, card: 0, talabat: 0, total: 0, expenses: 0, net: 0 }
  );

  const chartData =
    view === "daily"
      ? (rows as DailyRow[]).slice().reverse().map((r) => ({
          label: r.date.slice(5),
          total: r.total,
        }))
      : view === "weekly"
      ? (rows as AggRow[]).slice().reverse().map((r) => ({
          label: r.weekStart?.slice(5) || "",
          total: r.total,
        }))
      : (rows as AggRow[]).slice().reverse().map((r) => ({
          label: r.month || "",
          total: r.total,
        }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
          Sales Reports
        </h1>
        <button
          onClick={() => {
            if (rows.length === 0) return;
            const exportData = (rows as DailyRow[]).map((r) => ({
              Date: r.date || (r as unknown as AggRow).month || (r as unknown as AggRow).weekStart || "",
              Cash: r.cash,
              Card: r.card,
              Talabat: r.talabat,
              Total: r.total,
              Expenses: r.expenses,
              Net: r.net,
              ...(view === "daily" ? { Notes: (r as DailyRow).notes || "", Staff: (r as DailyRow).staff_name || "" } : {}),
            }));
            exportToExcel(exportData, `QoM_Sales_${view}_${new Date().toISOString().split("T")[0]}`);
          }}
          disabled={rows.length === 0}
          className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          Export Page
        </button>
        <a
          href="/api/admin/sales-excel"
          className="px-4 py-2 bg-gold text-white rounded-lg text-sm font-medium hover:bg-gold-dark"
        >
          Full Report .xlsx
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex bg-admin-card rounded-lg border border-admin-border overflow-hidden">
          {(["daily", "weekly", "monthly"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                view === v
                  ? "bg-teal text-white"
                  : "text-admin-text2 hover:bg-admin-card-hover"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={from.slice(0, 4) || new Date().getFullYear().toString()}
            onChange={(e) => {
              const y = e.target.value;
              const m = to.slice(5, 7) || "01";
              setFrom(`${y}-${m}-01`);
              const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
              setTo(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
            }}
            className="px-3 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
          <select
            value={from.slice(5, 7) || "01"}
            onChange={(e) => {
              const y = from.slice(0, 4) || new Date().getFullYear().toString();
              const m = e.target.value;
              setFrom(`${y}-${m}-01`);
              const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
              setTo(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
            }}
            className="px-3 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm"
          >
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((name, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Revenue" value={formatAED(totals.total)} />
        <SummaryCard label="Cash" value={formatAED(totals.cash)} />
        <SummaryCard label="Card" value={formatAED(totals.card)} />
        <SummaryCard label="Talabat" value={formatAED(totals.talabat)} />
        <SummaryCard label="Expenses" value={formatAED(totals.expenses)} />
        <SummaryCard label="Net" value={formatAED(totals.net)} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                />
                <Bar dataKey="total" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-admin-text2">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-admin-text3">No data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left text-admin-text3 font-medium">
                    {view === "daily" ? "Date" : view === "weekly" ? "Week" : "Month"}
                  </th>
                  {view !== "daily" && (
                    <th className="px-3 py-3 text-right text-admin-text3 font-medium">Days</th>
                  )}
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Cash</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Card</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Talabat</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Total</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Expenses</th>
                  <th className="px-3 py-3 text-right text-admin-text3 font-medium">Net</th>
                  {view === "daily" && <>
                    <th className="px-3 py-3 text-right text-admin-text3 font-medium">Notes</th>
                    <th className="px-3 py-3 text-right text-admin-text3 font-medium">By</th>
                  </>}
                  {view !== "daily" && (
                    <th className="px-3 py-3 text-right text-admin-text3 font-medium">Avg/Day</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isDaily = view === "daily";
                  const r = row as DailyRow & AggRow;
                  const key = isDaily ? r.id || i : r.month || r.weekStart || i;
                  const dateLabel = isDaily
                    ? r.date
                    : view === "weekly"
                    ? `${r.weekStart} → ${r.weekEnd}`
                    : r.month;

                  return (
                    <tr
                      key={String(key)}
                      className="border-b border-admin-border/50 hover:bg-admin-card-hover cursor-pointer"
                      onClick={() =>
                        isDaily && setExpandedRow(expandedRow === r.id ? null : r.id)
                      }
                    >
                      <td className="px-4 py-2.5 text-admin-text">{dateLabel}</td>
                      {!isDaily && (
                        <td className="px-3 py-2.5 text-right text-admin-text2">{r.days}</td>
                      )}
                      <td className="px-3 py-2.5 text-right text-admin-text2">
                        {r.cash.toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-admin-text2">
                        {r.card.toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-admin-text2">
                        {r.talabat.toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-admin-text font-medium">
                        {r.total.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-danger">
                        {r.expenses.toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-teal font-medium">
                        {r.net.toFixed(2)}
                      </td>
                      {isDaily && (
                        <>
                          <td className="px-3 py-2.5 text-right text-admin-text3 text-xs max-w-32 truncate">
                            {r.notes || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-admin-text2 text-xs">
                            {(r as DailyRow).staff_name || "—"}
                          </td>
                        </>
                      )}
                      {!isDaily && (
                        <td className="px-3 py-2.5 text-right text-gold">
                          {r.avgDaily?.toFixed(0)}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {/* Totals Row */}
                <tr className="bg-admin-bg font-semibold">
                  <td className="px-4 py-3 text-admin-text">TOTAL</td>
                  {view !== "daily" && <td className="px-3 py-3 text-right text-admin-text2">{rows.length}</td>}
                  <td className="px-3 py-3 text-right text-admin-text">{totals.cash.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-admin-text">{totals.card.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-admin-text">{totals.talabat.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-admin-text">{totals.total.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-danger">{totals.expenses.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-teal">{totals.net.toFixed(2)}</td>
                  {view === "daily" && <><td /><td /></>}
                  {view !== "daily" && (
                    <td className="px-3 py-3 text-right text-gold">
                      {(totals.total / (rows.length || 1)).toFixed(0)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded expense details */}
      {expandedRow && view === "daily" && (
        <div className="bg-admin-card rounded-xl border border-teal/30 p-4">
          <h4 className="text-sm font-semibold text-teal mb-2">Expense Breakdown</h4>
          {(() => {
            const row = (rows as DailyRow[]).find((r) => r.id === expandedRow);
            if (!row?.expense_items?.length) return <p className="text-admin-text3 text-sm">No expenses logged</p>;
            return (
              <div className="space-y-1">
                {row.expense_items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-admin-text2">
                      {item.description}{" "}
                      <span className="text-admin-text3 text-xs">({item.category})</span>
                    </span>
                    <span className="text-admin-text">{item.amount.toFixed(2)} AED</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Report Photo */}
          {(() => {
            const row = (rows as DailyRow[]).find((r) => r.id === expandedRow);
            if (!row) return null;
            return <ReportPhoto date={row.date} />;
          })()}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-admin-card rounded-lg border border-admin-border p-3">
      <p className="text-[10px] text-admin-text3">{label}</p>
      <p className="text-sm font-bold text-admin-text mt-0.5">{value}</p>
    </div>
  );
}

function ReportPhoto({ date }: { date: string }) {
  const [photo, setPhoto] = useState<{ found: boolean; url?: string; fileName?: string } | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    fetch(`/api/sales/report-photo?date=${date}`)
      .then(r => r.json())
      .then(setPhoto)
      .catch(() => setPhoto({ found: false }));
  }, [date]);

  if (!photo || !photo.found) {
    return <p className="text-xs text-admin-text3 mt-3">No report photo for this day</p>;
  }

  return (
    <div className="mt-3 border-t border-admin-border pt-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-admin-text2">📸 Daily Report Photo</span>
        <button onClick={() => setShowPhoto(!showPhoto)}
          className="text-xs text-teal hover:underline">
          {showPhoto ? "Hide" : "View"}
        </button>
        <a href={photo.url} target="_blank" rel="noopener noreferrer" download
          className="text-xs text-gold hover:underline">
          Download
        </a>
      </div>
      {showPhoto && photo.url && (
        <img src={photo.url} alt={`Report ${date}`} className="mt-2 max-h-96 rounded-lg border border-admin-border" />
      )}
    </div>
  );
}
