"use client";

import { APP_VERSION, APP_BUILD_DATE } from "@/lib/version";

const CHANGELOG = [
  {
    version: "2.6.0",
    date: "Apr 3, 2026",
    changes: [
      "Live Sales Report Excel — download updated xlsx from anywhere",
      "File stored in Supabase cloud, syncs to PC when online",
      "PWA support — add to home screen looks like real app",
      "Admin inventory: filter by status (All/OUT/LOW/OK)",
      "Admin inventory: shows last count time and who counted",
      "Sales reports: year + month selector instead of date pickers",
      "Sales reports: shows who submitted each entry",
      "Sales entry: business day ends at 2 AM (not midnight)",
      "Sales entry: confirms before overwriting existing entry",
      "Sales entry: blocks future dates (no more 2028 typos)",
      "Self-awareness protocol for Claude sessions",
    ],
  },
  {
    version: "2.5.0",
    date: "Apr 1, 2026",
    changes: [
      "AI Chat for staff — ask about inventory, update counts via conversation",
      "Auto inventory deduction engine (recipe-based)",
      "Smart inventory reminders on staff dashboard",
      "Staff login notifications (alerts, reminders, admin messages)",
      "Admin broadcast messages to all staff",
      "AI expense save — auto-creates daily entry if missing",
      "Fuzzy spelling in AI chat (katchaub → ketchup)",
      "QoM logo throughout the app",
      "Admin login redirect fix (router.push race condition)",
    ],
  },
  {
    version: "2.1.0",
    date: "Mar 31, 2026",
    changes: [
      "Recipe Map — 88 menu items, link ingredients & packaging",
      "AI Upload with caption/notes for better recognition",
      "Camera viewfinder — full screen, portrait mode",
      "Chat input on AI review screen",
    ],
  },
  {
    version: "2.0.0",
    date: "Mar 31, 2026",
    changes: [
      "AI Upload — photo → Claude Vision → extract → confirm → save",
      "Supports Z reports, expense receipts, delivery invoices, inventory photos",
      "Bilingual AI (English + Filipino)",
    ],
  },
  {
    version: "1.6.0",
    date: "Mar 31, 2026",
    changes: [
      "Vault Brain — persistent AI memory synced via Obsidian",
      "Live State, AI Memory, Daily summaries auto-generated",
      "Cloud Notes — create/edit markdown from anywhere",
    ],
  },
  {
    version: "1.5.0",
    date: "Mar 31, 2026",
    changes: [
      "Excel export on all admin pages (Sales, Inventory, Financials, Analytics, Activity)",
      "Multi-sheet exports for Financials and Analytics",
    ],
  },
  {
    version: "1.4.0",
    date: "Mar 31, 2026",
    changes: [
      "Full security audit — 34 findings, ALL fixed",
      "Supabase RLS on all 19 tables",
      "iron-session signed cookies",
      "Rate limiting on login (5/5min/IP)",
      "Auth on all API routes",
      "Form labels for accessibility",
      "Stable React keys, next/font, N+1 fix",
    ],
  },
  {
    version: "1.3.0",
    date: "Mar 31, 2026",
    changes: [
      "Manager login (Mohamed PIN, direct entry)",
      "Staff dashboard with greeting and quick actions",
      "Forced PIN change on first login",
      "Staff name shown in header after login",
      "Admin Activity Log page",
      "Mobile responsive admin (hamburger menu)",
      "Staff help page (bilingual EN/Filipino)",
    ],
  },
  {
    version: "1.2.0",
    date: "Mar 31, 2026",
    changes: [
      "Telegram bot with inline buttons and visual bars",
      "Vercel deployment with GitHub auto-deploy",
      "Staff inventory optimized (collapsible categories)",
    ],
  },
  {
    version: "1.0.0",
    date: "Mar 31, 2026",
    changes: [
      "Phase 1: Staff portal + Admin dashboard + Sales reports",
      "Phase 2: Inventory management (149 items)",
      "Phase 3: Financials (P&L, ADCB bank, equity, expenses)",
      "Phase 4: Analytics (heatmap, trends, channels)",
      "Phase 5: MCP server (18 tools) + Vault sync",
      "Phase 6: Data migration (132 days, 2402 orders)",
      "Phase 7: Automation (alerts, daily reports, notifications)",
      "15 database tables, Supabase PostgreSQL (Mumbai)",
      "Dark admin theme, light staff theme, bilingual",
    ],
  },
];

export default function AdminChangelog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
          Changelog
        </h1>
        <p className="text-sm text-admin-text3">
          Current: v{APP_VERSION} ({APP_BUILD_DATE})
        </p>
      </div>

      <div className="space-y-4">
        {CHANGELOG.map((release) => (
          <div key={release.version} className="bg-admin-card rounded-xl border border-admin-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-sm font-bold px-2.5 py-1 rounded ${
                release.version === APP_VERSION ? "bg-teal text-white" : "bg-admin-bg text-admin-text2"
              }`}>
                v{release.version}
              </span>
              <span className="text-xs text-admin-text3">{release.date}</span>
              {release.version === APP_VERSION && (
                <span className="text-xs text-teal">Current</span>
              )}
            </div>
            <ul className="space-y-1">
              {release.changes.map((change, i) => (
                <li key={i} className="text-sm text-admin-text2 flex gap-2">
                  <span className="text-admin-text3 mt-1">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
