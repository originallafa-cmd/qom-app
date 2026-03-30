"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatAED } from "@/lib/utils";

interface DashboardData {
  today: {
    cash: number;
    card: number;
    talabat: number;
    total: number;
    expenses: number;
    net: number;
  };
  month: {
    revenue: number;
    avgDaily: number;
    days: number;
    channelSplit: {
      cash: number;
      cashPct: number;
      card: number;
      cardPct: number;
      talabat: number;
      talabatPct: number;
    };
    dailyData: { date: string; total: number; cash: number; card: number; talabat: number }[];
  };
  equity: number;
  adcbBalance: number;
  inventory: {
    outOfStock: number;
    lowStock: number;
    alerts: { name: string; type: string; qty: number; status: string }[];
  };
  recentActivity: { id: string; action: string; table: string; time: string; staff: string }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-admin-text2 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-danger">Failed to load dashboard data</p>
      </div>
    );
  }

  const chartData = (data.month.dailyData || []).map((d) => ({
    date: d.date.slice(5),
    total: d.total,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
          Dashboard
        </h1>
        <p className="text-admin-text3 text-sm">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Today's Revenue"
          value={formatAED(data.today.total)}
          subtitle={`Net: ${formatAED(data.today.net)}`}
          color="teal"
        />
        <KPICard
          label="Month Revenue"
          value={formatAED(data.month.revenue)}
          subtitle={`Avg: ${formatAED(data.month.avgDaily)}/day (${data.month.days}d)`}
          color="teal"
        />
        <KPICard
          label="ADCB Balance"
          value={formatAED(data.adcbBalance)}
          subtitle="Current balance"
          color="info"
        />
        <KPICard
          label="Equity"
          value={formatAED(data.equity)}
          subtitle="Post-reset balance"
          color={data.equity === 0 ? "success" : "gold"}
        />
      </div>

      {/* Today's Breakdown + Channel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today Breakdown */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-4">Today&apos;s Breakdown</h3>
          <div className="space-y-3">
            <ChannelBar label="Cash" amount={data.today.cash} total={data.today.total} color="#22c55e" />
            <ChannelBar label="Card" amount={data.today.card} total={data.today.total} color="#3b82f6" />
            <ChannelBar label="Talabat" amount={data.today.talabat} total={data.today.total} color="#f59e0b" />
            <div className="border-t border-admin-border pt-2 flex justify-between text-sm">
              <span className="text-admin-text2">Expenses</span>
              <span className="text-danger font-medium">-{formatAED(data.today.expenses)}</span>
            </div>
          </div>
        </div>

        {/* Channel Split (Month) */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-4">Channel Split (Month)</h3>
          <div className="space-y-3">
            <ChannelBar
              label={`Talabat (${data.month.channelSplit.talabatPct.toFixed(0)}%)`}
              amount={data.month.channelSplit.talabat}
              total={data.month.revenue}
              color="#f59e0b"
            />
            <ChannelBar
              label={`Card (${data.month.channelSplit.cardPct.toFixed(0)}%)`}
              amount={data.month.channelSplit.card}
              total={data.month.revenue}
              color="#3b82f6"
            />
            <ChannelBar
              label={`Cash (${data.month.channelSplit.cashPct.toFixed(0)}%)`}
              amount={data.month.channelSplit.cash}
              total={data.month.revenue}
              color="#22c55e"
            />
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-5">
        <h3 className="text-sm font-semibold text-admin-text2 mb-4">Daily Revenue This Month</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
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
                formatter={(value) => [formatAED(Number(value)), "Revenue"]}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.total > (data?.month.avgDaily || 0) ? "#14b8a6" : "#1e293b"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Alerts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Alerts */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-3">
            Inventory Alerts
            {(data.inventory.outOfStock > 0 || data.inventory.lowStock > 0) && (
              <span className="ml-2 text-xs text-danger">
                {data.inventory.outOfStock} out · {data.inventory.lowStock} low
              </span>
            )}
          </h3>
          {data.inventory.alerts.length === 0 ? (
            <p className="text-success text-sm">All items stocked</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.inventory.alerts.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div>
                    <span className="text-admin-text">{item.name}</span>
                    <span className="text-admin-text3 text-xs ml-2">({item.type})</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      item.status === "out"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {item.status === "out" ? "OUT" : `${item.qty} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-5">
          <h3 className="text-sm font-semibold text-admin-text2 mb-3">Recent Activity</h3>
          {data.recentActivity.length === 0 ? (
            <p className="text-admin-text3 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <span className="text-admin-text capitalize">{activity.action}</span>
                    <span className="text-admin-text3 text-xs ml-1">{activity.table}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-admin-text3 text-xs">{activity.staff}</span>
                    <br />
                    <span className="text-admin-text3 text-[10px]">
                      {new Date(activity.time).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    teal: "border-teal/30 text-teal",
    gold: "border-gold/30 text-gold",
    success: "border-success/30 text-success",
    info: "border-info/30 text-info",
    danger: "border-danger/30 text-danger",
  };

  return (
    <div className="bg-admin-card rounded-xl border border-admin-border p-4">
      <p className="text-xs text-admin-text3 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorMap[color] || "text-admin-text"}`}>
        {value}
      </p>
      <p className="text-xs text-admin-text3 mt-1">{subtitle}</p>
    </div>
  );
}

function ChannelBar({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-admin-text2">{label}</span>
        <span className="text-admin-text font-medium">{formatAED(amount)}</span>
      </div>
      <div className="h-2 bg-admin-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
