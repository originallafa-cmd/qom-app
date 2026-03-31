"use client";

import { useState, useEffect } from "react";

interface Activity {
  id: string;
  action: string;
  table: string;
  recordId: string | null;
  data: Record<string, unknown> | null;
  time: string;
  staff: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  create: { label: "Created", icon: "🟢", color: "text-success" },
  update: { label: "Updated", icon: "🟡", color: "text-warning" },
  delete: { label: "Deleted", icon: "🔴", color: "text-danger" },
  inventory_count: { label: "Counted", icon: "📦", color: "text-info" },
  update_pin: { label: "PIN Changed", icon: "🔑", color: "text-gold" },
  change_pin: { label: "PIN Changed (self)", icon: "🔑", color: "text-gold" },
  login: { label: "Logged in", icon: "🔐", color: "text-teal" },
};

const TABLE_LABELS: Record<string, string> = {
  daily_sales: "Daily Sales",
  expense_items: "Expenses",
  inventory_items: "Inventory",
  inventory_counts: "Inventory Count",
  production_log: "Production",
  deliveries: "Delivery",
  bank_transactions: "Bank",
  equity_ledger: "Equity",
  expenses_monthly: "Monthly Expense",
  staff: "Staff",
};

export default function AdminActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/activity?limit=100")
      .then((r) => r.json())
      .then((data) => setActivities(Array.isArray(data) ? data : []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by date
  const grouped: Record<string, Activity[]> = {};
  activities.forEach((a) => {
    const date = new Date(a.time).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(a);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
          Activity Log
        </h1>
        <p className="text-sm text-admin-text3">
          Track all staff actions — who did what and when
        </p>
      </div>

      {loading ? (
        <p className="text-admin-text2 text-center py-12">Loading...</p>
      ) : activities.length === 0 ? (
        <div className="bg-admin-card rounded-xl border border-admin-border p-8 text-center">
          <p className="text-admin-text3">No activity recorded yet.</p>
          <p className="text-admin-text3 text-sm mt-1">
            Actions will appear here when staff use the app.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-admin-text3 mb-3 sticky top-0 bg-admin-bg py-1">
              {date}
            </h3>
            <div className="space-y-2">
              {entries.map((a) => {
                const actionInfo = ACTION_LABELS[a.action] || {
                  label: a.action,
                  icon: "⚪",
                  color: "text-admin-text2",
                };
                const tableLabel = TABLE_LABELS[a.table] || a.table;
                const time = new Date(a.time).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                // Extract useful info from data
                let detail = "";
                if (a.data) {
                  if (a.table === "daily_sales" && a.data.date) {
                    detail = `Date: ${a.data.date}`;
                  } else if (a.table === "inventory_items" && a.data.qty !== undefined) {
                    detail = `Qty: ${a.data.qty}`;
                  } else if (a.action === "update_pin" && a.data.staffName) {
                    detail = `Staff: ${a.data.staffName}`;
                  }
                }

                return (
                  <div
                    key={a.id}
                    className="bg-admin-card rounded-lg border border-admin-border p-3 flex items-center gap-3"
                  >
                    <span className="text-lg">{actionInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-admin-text">
                          {a.staff}
                        </span>
                        <span className={`text-xs ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-xs bg-admin-bg text-admin-text2 px-1.5 py-0.5 rounded">
                          {tableLabel}
                        </span>
                      </div>
                      {detail && (
                        <p className="text-xs text-admin-text3 mt-0.5">{detail}</p>
                      )}
                    </div>
                    <span className="text-xs text-admin-text3 whitespace-nowrap">
                      {time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
