"use client";

import { useState, useEffect, useCallback } from "react";
import { formatAED } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie,
} from "recharts";

interface AnalyticsData {
  summary: {
    totalRevenue: number; totalDays: number; avgDaily: number;
    totalOrders: number; aov: number;
    bestDay: { date: string; total: number } | null;
    worstDay: { date: string; total: number } | null;
  };
  monthlyTrends: {
    month: string; revenue: number; avgDaily: number; days: number;
    cash: number; card: number; talabat: number; expenses: number; net: number;
    cashPct: number; cardPct: number; talabatPct: number;
  }[];
  dayOfWeek: { day: string; dayNum: number; totalRevenue: number; avgRevenue: number; count: number }[];
  hourlyHeatmap: { hour: number; label: string; revenue: number; orders: number; avgOrder: number }[];
  channelAnalysis: {
    cash: { gross: number; pct: number; actual: number; feePct: number };
    card: { gross: number; pct: number; actual: number; feePct: number };
    talabat: { gross: number; pct: number; actual: number; feePct: number };
  };
  orderDistribution: { label: string; count: number; revenue: number; pct: number }[];
}

const TOOLTIP_STYLE = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: "8px",
  color: "#f1f5f9",
  fontSize: "12px",
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-admin-text2">Loading analytics...</p></div>;
  if (!data) return <div className="flex items-center justify-center h-96"><p className="text-danger">Failed to load</p></div>;

  const { summary: s, monthlyTrends, dayOfWeek, hourlyHeatmap, channelAnalysis, orderDistribution } = data;
  const maxHourlyOrders = Math.max(...hourlyHeatmap.map((h) => h.orders), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">Analytics</h1>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm" />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Total Revenue" value={formatAED(s.totalRevenue)} />
        <KPI label="Avg Daily" value={formatAED(s.avgDaily)} />
        <KPI label="Total Orders" value={s.totalOrders.toLocaleString()} />
        <KPI label="AOV" value={formatAED(s.aov)} />
        <KPI label="Days Tracked" value={`${s.totalDays}`} />
      </div>
      {s.bestDay && s.worstDay && (
        <div className="flex gap-4 text-sm">
          <span className="text-success">Best: {s.bestDay.date} ({formatAED(s.bestDay.total)})</span>
          <span className="text-danger">Worst: {s.worstDay.date} ({formatAED(s.worstDay.total)})</span>
        </div>
      )}

      {/* Monthly Trends */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-5">
        <h3 className="text-sm font-semibold text-admin-text2 mb-4">Monthly Revenue Trends</h3>
        {monthlyTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatAED(Number(v)), ""]} />
                <Bar dataKey="cash" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Cash" />
                <Bar dataKey="card" stackId="a" fill="#3b82f6" name="Card" />
                <Bar dataKey="talabat" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Talabat" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-admin-text3 text-sm">No data</p>}

        {/* Monthly table */}
        {monthlyTrends.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-2 py-2 text-left text-admin-text3">Month</th>
                  <th className="px-2 py-2 text-right text-admin-text3">Revenue</th>
                  <th className="px-2 py-2 text-right text-admin-text3">Avg/Day</th>
                  <th className="px-2 py-2 text-right text-admin-text3">Days</th>
                  <th className="px-2 py-2 text-right text-admin-text3">Talabat%</th>
                  <th className="px-2 py-2 text-right text-admin-text3">Card%</th>
                  <th className="px-2 py-2 text-right text-admin-text3">Cash%</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((m) => (
                  <tr key={m.month} className="border-b border-admin-border/30">
                    <td className="px-2 py-1.5 text-admin-text">{m.month}</td>
                    <td className="px-2 py-1.5 text-right text-admin-text font-medium">{formatAED(m.revenue)}</td>
                    <td className="px-2 py-1.5 text-right text-teal">{formatAED(m.avgDaily)}</td>
                    <td className="px-2 py-1.5 text-right text-admin-text2">{m.days}</td>
                    <td className="px-2 py-1.5 text-right text-gold">{m.talabatPct.toFixed(0)}%</td>
                    <td className="px-2 py-1.5 text-right text-info">{m.cardPct.toFixed(0)}%</td>
                    <td className="px-2 py-1.5 text-right text-success">{m.cashPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Day of Week + AOV Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day of Week */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-4">Day of Week Performance</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeek.sort((a, b) => a.dayNum - b.dayNum)} layout="vertical">
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="day" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatAED(Number(v)), "Avg/Day"]} />
                <Bar dataKey="avgRevenue" radius={[0, 4, 4, 0]}>
                  {dayOfWeek.sort((a, b) => a.dayNum - b.dayNum).map((d, i) => (
                    <Cell key={i} fill={d.dayNum === 5 ? "#14b8a6" : d.dayNum === 4 ? "#f59e0b" : "#1e293b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Analysis */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-4">Channel Analysis</h3>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Talabat", value: channelAnalysis.talabat.gross },
                      { name: "Card", value: channelAnalysis.card.gross },
                      { name: "Cash", value: channelAnalysis.cash.gross },
                    ]}
                    dataKey="value"
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={55}
                    strokeWidth={0}
                  >
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#22c55e" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {[
                { label: "Talabat", data: channelAnalysis.talabat, color: "#f59e0b" },
                { label: "Card", data: channelAnalysis.card, color: "#3b82f6" },
                { label: "Cash", data: channelAnalysis.cash, color: "#22c55e" },
              ].map((ch) => (
                <div key={ch.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-admin-text2">{ch.label} ({ch.data.pct.toFixed(0)}%)</span>
                    <span className="text-admin-text">{formatAED(ch.data.gross)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-admin-text3">
                    <span>Fee: {ch.data.feePct}%</span>
                    <span>Actual: {formatAED(ch.data.actual)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Heatmap */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-5">
        <h3 className="text-sm font-semibold text-admin-text2 mb-4">Hourly Order Pattern</h3>
        <div className="flex gap-1 items-end h-32">
          {hourlyHeatmap.map((h) => {
            const intensity = h.orders / maxHourlyOrders;
            const height = Math.max(intensity * 100, 2);
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${h.label}: ${h.orders} orders, ${formatAED(h.revenue)}`}>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${height}%`,
                    backgroundColor: intensity > 0.7 ? "#14b8a6" : intensity > 0.3 ? "#f59e0b" : intensity > 0 ? "#1e293b" : "#0a0f1a",
                  }}
                />
                <span className="text-[9px] text-admin-text3">{h.hour}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-admin-text3">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>

      {/* Order Value Distribution + Monthly Avg Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Distribution */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-4">Order Value Distribution</h3>
          {orderDistribution.some((d) => d.count > 0) ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderDistribution}>
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-admin-text3 text-sm">No order data — import Sapaad CSVs to see this</p>}
        </div>

        {/* AOV Trend */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-4">Average Daily Revenue Trend</h3>
          {monthlyTrends.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatAED(Number(v)), ""]} />
                  <Line type="monotone" dataKey="avgDaily" stroke="#14b8a6" strokeWidth={2} dot={{ fill: "#14b8a6", r: 4 }} name="Avg Daily" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-admin-text3 text-sm">No data</p>}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-admin-card rounded-lg border border-admin-border p-3">
      <p className="text-[10px] text-admin-text3">{label}</p>
      <p className="text-lg font-bold text-admin-text mt-0.5">{value}</p>
    </div>
  );
}
