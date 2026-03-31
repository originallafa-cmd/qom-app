"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Reminder {
  type: string;
  severity: string;
  message: string;
  item?: string;
}

interface DashboardData {
  staffName: string;
  role: string;
  today: { total: number; cash: number; card: number; talabat: number; expenses: number; net: number } | null;
  alerts: { out: number; low: number };
  todayProduction: number;
  reminders: Reminder[];
}

export default function StaffDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [lang, setLang] = useState<"en" | "fil">("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, salesRes, alertsRes, prodRes, remindersRes] = await Promise.all([
          fetch("/api/auth/staff/session"),
          fetch("/api/sales/recent"),
          fetch("/api/inventory/alerts"),
          fetch(`/api/production?from=${new Date().toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}`),
          fetch("/api/inventory/reminders"),
        ]);

        const session = await sessionRes.json();
        const sales = await salesRes.json();
        const alerts = await alertsRes.json();
        const production = await prodRes.json();
        const remindersData = await remindersRes.json();

        const today = Array.isArray(sales) ? sales.find((s: { date: string }) => s.date === new Date().toISOString().split("T")[0]) : null;
        const alertItems = Array.isArray(alerts) ? alerts : [];

        setData({
          staffName: session.name || "Staff",
          role: session.role || "staff",
          today: today || null,
          alerts: {
            out: alertItems.filter((a: { status: string }) => a.status === "out").length,
            low: alertItems.filter((a: { status: string }) => a.status === "low").length,
          },
          todayProduction: Array.isArray(production) ? production.length : 0,
          reminders: Array.isArray(remindersData?.reminders) ? remindersData.reminders.slice(0, 5) : [],
        });
      } catch { /* */ }
      setLoading(false);
    }
    load();
  }, []);

  const t = lang === "en" ? {
    greeting: "Good",
    morning: "morning", afternoon: "afternoon", evening: "evening",
    todaySales: "Today's Sales", notSubmitted: "Not submitted yet", submitted: "Submitted",
    quickActions: "Quick Actions",
    enterSales: "Enter Sales", countInventory: "Count Inventory", logProduction: "Log Production", logDelivery: "Log Delivery", help: "Help Guide",
    alerts: "Alerts",
    noAlerts: "All good!",
  } : {
    greeting: "Magandang",
    morning: "umaga", afternoon: "hapon", evening: "gabi",
    todaySales: "Benta Ngayon", notSubmitted: "Hindi pa naisumite", submitted: "Naisumite na",
    quickActions: "Mabilisang Aksyon",
    enterSales: "I-enter Benta", countInventory: "Bilangin Imbentaryo", logProduction: "I-log Produksyon", logDelivery: "I-log Delivery", help: "Gabay",
    alerts: "Alerto",
    noAlerts: "OK lahat!",
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? t.morning : hour < 17 ? t.afternoon : t.evening;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-staff-text2">Loading...</p></div>;
  }

  const isManager = data?.role === "manager";

  return (
    <div className="space-y-4 pb-8">
      {/* Language toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setLang(lang === "en" ? "fil" : "en")}
          className="text-xs px-2 py-1 rounded bg-staff-bg border border-staff-border text-staff-text2"
        >
          {lang === "en" ? "FIL" : "EN"}
        </button>
      </div>

      {/* Greeting */}
      <div className="bg-staff-card rounded-2xl border border-staff-border p-5">
        <p className="text-staff-text2 text-sm">{t.greeting} {timeGreeting},</p>
        <h1 className="text-2xl font-bold text-staff-text font-[family-name:var(--font-cairo)]">
          {data?.staffName}
        </h1>
        {isManager && (
          <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full mt-1 inline-block">Manager</span>
        )}
      </div>

      {/* Today's Sales Status */}
      <div className={`rounded-xl border p-4 ${
        data?.today
          ? "bg-success/5 border-success/20"
          : "bg-warning/5 border-warning/20"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-staff-text">{t.todaySales}</p>
            {data?.today ? (
              <>
                <p className="text-2xl font-bold text-teal mt-1">
                  {data.today.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                </p>
                <p className="text-xs text-staff-text2 mt-0.5">
                  Cash {data.today.cash.toFixed(0)} · Card {data.today.card.toFixed(0)} · Talabat {data.today.talabat.toFixed(0)}
                </p>
              </>
            ) : (
              <p className="text-sm text-warning mt-1">{t.notSubmitted}</p>
            )}
          </div>
          <div className="text-3xl">{data?.today ? "✅" : "⏳"}</div>
        </div>
      </div>

      {/* Alerts */}
      {(data?.alerts.out || 0) + (data?.alerts.low || 0) > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-staff-text mb-1">{t.alerts}</p>
          <div className="flex gap-4 text-sm">
            {data!.alerts.out > 0 && (
              <span className="text-danger">🔴 {data!.alerts.out} out of stock</span>
            )}
            {data!.alerts.low > 0 && (
              <span className="text-warning">🟡 {data!.alerts.low} low stock</span>
            )}
          </div>
        </div>
      )}

      {/* Smart Reminders */}
      {data && data.reminders && data.reminders.length > 0 && (
        <div className="bg-staff-card rounded-xl border border-staff-border p-4">
          <p className="text-sm font-semibold text-staff-text mb-2">
            {lang === "en" ? "Reminders" : "Paalala"} ({data.reminders.length})
          </p>
          <div className="space-y-2">
            {data.reminders.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                r.severity === "critical" ? "bg-danger/5 border border-danger/20" :
                r.severity === "warning" ? "bg-warning/5 border border-warning/20" :
                "bg-info/5 border border-info/20"
              }`}>
                <span className="text-base mt-0.5">{
                  r.severity === "critical" ? "🔴" : r.severity === "warning" ? "🟡" : "🔵"
                }</span>
                <span className="text-staff-text2 text-xs">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="text-sm font-semibold text-staff-text2 mb-2">{t.quickActions}</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/staff/sales" icon="💰" label={t.enterSales} highlight={!data?.today} />
          <QuickAction href="/staff/inventory" icon="📦" label={t.countInventory} badge={(data?.alerts.out || 0) + (data?.alerts.low || 0) > 0 ? `${(data?.alerts.out || 0) + (data?.alerts.low || 0)}` : undefined} />
          <QuickAction href="/staff/production" icon="🍳" label={t.logProduction} />
          <QuickAction href="/staff/receiving" icon="🚚" label={t.logDelivery} />
          <QuickAction href="/staff/help" icon="❓" label={t.help} />
          {isManager && (
            <QuickAction href="/admin" icon="📊" label="Admin Portal" external />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, highlight, badge, external }: {
  href: string; icon: string; label: string; highlight?: boolean; badge?: string; external?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
        highlight
          ? "bg-teal/5 border-teal/30 hover:bg-teal/10"
          : "bg-staff-card border-staff-border hover:bg-staff-bg"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-staff-text block truncate">{label}</span>
        {external && <span className="text-[10px] text-staff-text2">Opens admin</span>}
      </div>
      {badge && (
        <span className="text-xs bg-danger text-white px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
      {highlight && (
        <span className="text-xs bg-teal/10 text-teal px-1.5 py-0.5 rounded-full">Now</span>
      )}
    </Link>
  );
}
