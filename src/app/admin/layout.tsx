"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/sales", label: "Sales Reports", icon: "💰" },
  { href: "/admin/inventory", label: "Inventory", icon: "📦" },
  { href: "/admin/financials", label: "Financials", icon: "🏦" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-admin-bg flex">
      {/* Sidebar */}
      <aside className="w-60 bg-admin-card border-r border-admin-border flex flex-col fixed h-full">
        <div className="p-4 border-b border-admin-border">
          <h1 className="text-xl font-bold text-gold font-[family-name:var(--font-cairo)]">
            ملكة المحشي
          </h1>
          <p className="text-xs text-admin-text3">Queen of Mahshi — Admin</p>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
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
      <main className="flex-1 ml-60 p-6">{children}</main>
    </div>
  );
}
