"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const navItems = [
  { href: "/staff/sales", labelKey: "dailySales" as const, icon: "💰" },
  { href: "/staff/inventory", labelKey: "inventory" as const, icon: "📦" },
  { href: "/staff/production", labelKey: "production" as const, icon: "🍳" },
  { href: "/staff/receiving", labelKey: "receiving" as const, icon: "🚚" },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");

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
        <h1 className="text-lg font-bold text-teal font-[family-name:var(--font-cairo)]">
          Queen of Mahshi
        </h1>
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

      {/* Navigation Tabs */}
      <nav className="bg-staff-card border-b border-staff-border px-2 flex overflow-x-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-teal text-teal"
                  : "border-transparent text-staff-text2 hover:text-staff-text"
              }`}
            >
              <span>{item.icon}</span>
              {t(locale, item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Page Content */}
      <main className="p-4 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
