"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";

const navItems = [
  { href: "/staff/dashboard", labelKey: "today" as const, icon: "🏠" },
  { href: "/staff/upload", labelKey: "submit" as const, icon: "📸" },
  { href: "/staff/sales", labelKey: "dailySales" as const, icon: "💰" },
  { href: "/staff/inventory", labelKey: "inventory" as const, icon: "📦" },
  { href: "/staff/production", labelKey: "production" as const, icon: "🍳" },
  { href: "/staff/receiving", labelKey: "receiving" as const, icon: "🚚" },
  { href: "/staff/chat", labelKey: "search" as const, icon: "🤖" },
  { href: "/staff/help", labelKey: "back" as const, icon: "❓" },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useLang();
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    // Get staff name from session
    fetch("/api/auth/staff/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setStaffName(data.name);
      })
      .catch(() => {});
  }, []);

  // Don't show nav on login page
  if (pathname === "/staff/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/auth/staff/logout", { method: "POST" });
    router.push("/staff/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-staff-bg">
      {/* Top Bar */}
      <header className="bg-staff-card border-b border-staff-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <a href="/" className="hover:opacity-80">
            <img src="/logo.png" alt="QoM" className="h-8" />
          </a>
          {staffName && (
            <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full font-medium">
              {staffName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "fil" : "en")}
            className="text-xs px-2 py-1 rounded-md bg-staff-bg border border-staff-border text-staff-text2"
          >
            {locale === "en" ? "FIL" : "EN"}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs px-2 py-1 rounded-md bg-danger/10 text-danger border border-danger/20"
          >
            {t(locale, "logout")}
          </button>
        </div>
      </header>

      {/* Navigation Tabs — scrollable on mobile */}
      <nav className="bg-staff-card border-b border-staff-border px-2 flex overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const active = item.href === "/staff/help"
            ? pathname === "/staff/help"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-w-0 ${
                active
                  ? "border-teal text-teal"
                  : "border-transparent text-staff-text2 hover:text-staff-text"
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{item.href === "/staff/help" ? (locale === "en" ? "Help" : "Tulong") : t(locale, item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Page Content — responsive padding */}
      <main className="p-4 max-w-2xl mx-auto pb-20">{children}</main>
    </div>
  );
}
