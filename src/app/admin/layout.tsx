"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/sales", label: "Sales Reports", icon: "💰" },
  { href: "/admin/inventory", label: "Inventory", icon: "📦" },
  { href: "/admin/financials", label: "Financials", icon: "🏦" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/recipes", label: "Recipe Map", icon: "🍽️" },
  { href: "/admin/notes", label: "Notes", icon: "📝" },
  { href: "/admin/changelog", label: "Changelog", icon: "📜" },
  { href: "/admin/activity", label: "Activity Log", icon: "📋" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-admin-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, toggle with hamburger */}
      <aside
        className={`w-60 bg-admin-card border-r border-admin-border flex flex-col fixed h-full z-50 transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-admin-border flex items-center justify-between">
          <a href="/" className="hover:opacity-80">
            <img src="/logo.png" alt="Queen of Mahshi" className="h-14" />
          </a>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-admin-text3 hover:text-admin-text"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal/10 text-teal border border-teal/20"
                    : "text-admin-text2 hover:text-admin-text hover:bg-admin-card-hover"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-admin-border">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg text-sm text-admin-text3 hover:text-danger hover:bg-danger/10 transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-60">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-admin-card border-b border-admin-border px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-admin-text2 hover:text-admin-text"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <img src="/logo.png" alt="QoM" className="h-7" />
          <div className="w-6" />
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
