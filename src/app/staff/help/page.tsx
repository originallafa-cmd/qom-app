"use client";

import { useState } from "react";

export default function StaffHelp() {
  const [lang, setLang] = useState<"en" | "fil">("en");

  const content = {
    en: {
      title: "How to Use This App",
      sections: [
        {
          icon: "🔐",
          title: "Login",
          steps: [
            "Open the app on the POS browser",
            "Enter your 4-digit PIN on the number pad",
            "Your name will show after login",
            "You will be automatically logged out after 30 minutes of no activity",
          ],
        },
        {
          icon: "💰",
          title: "Daily Sales Entry",
          steps: [
            "Tap 'Daily Sales' tab at the top",
            "Check the date — it should be today",
            "Enter Cash Sales amount (AED)",
            "Enter Card Sales amount — this includes POS, Link Payment, Visa, and Bank Transfer",
            "Enter Talabat Sales amount",
            "Enter Opening Cash (how much cash was in the drawer at start of day)",
            "Enter PT Cash Top-up ONLY if Mohamed sent money today",
            "Add each expense — tap '+ Add Expense', enter description, amount, and choose a category (Vegetables, Bread, Drinks, Cleaning, Other)",
            "Notes field is for PROBLEMS ONLY — voids, refunds, missing cash. Leave empty if no problems",
            "Check the summary at bottom: Total, Expenses, Net, Closing Cash",
            "Tap 'Submit Daily Sales'",
            "You can view the last 10 days by tapping 'Recent Entries'",
          ],
          important: "You can only edit today's entry. If you need to fix a past day, ask Mohamed.",
        },
        {
          icon: "📦",
          title: "Inventory Count",
          steps: [
            "Tap 'Inventory' tab",
            "Choose category: Grocery, Packaging, or Kitchen/Frozen",
            "Use search to find items quickly",
            "For each item, enter the new quantity in the box",
            "Tap 'Update' to save",
            "Colors show status: GREEN = OK, YELLOW = Low, RED = Out of Stock",
          ],
        },
        {
          icon: "🍳",
          title: "Production Log",
          steps: [
            "Tap 'Production' tab",
            "Select what you produced (Samosa, Rolls, etc.)",
            "Enter quantity and unit",
            "Add notes if needed",
            "Tap 'Log Production'",
            "Today's production shows at the bottom",
          ],
        },
        {
          icon: "🚚",
          title: "Receiving / Deliveries",
          steps: [
            "Tap 'Receiving' tab",
            "Enter the supplier name",
            "Add each item received — name, quantity, unit",
            "Tap '+ Add Item' for more items",
            "Add any notes about the delivery",
            "Tap 'Log Delivery'",
          ],
        },
        {
          icon: "⚠️",
          title: "Important Rules",
          steps: [
            "Submit daily sales EVERY day before closing",
            "Notes = PROBLEMS ONLY (voids, refunds, missing cash)",
            "Card = ALL card types combined (POS + Link + Visa + Transfer)",
            "Count inventory honestly — don't guess",
            "If something looks wrong, tell Mohamed immediately",
            "Don't share your PIN with anyone",
          ],
        },
      ],
    },
    fil: {
      title: "Paano Gamitin ang App na Ito",
      sections: [
        {
          icon: "🔐",
          title: "Pag-login",
          steps: [
            "Buksan ang app sa POS browser",
            "Ilagay ang iyong 4-digit PIN sa number pad",
            "Makikita ang pangalan mo pagkatapos mag-login",
            "Awtomatikong mag-lo-logout pagkatapos ng 30 minuto na walang ginagawa",
          ],
        },
        {
          icon: "💰",
          title: "Pag-enter ng Benta ng Araw",
          steps: [
            "I-tap ang 'Benta ng Araw' tab sa itaas",
            "Tignan ang petsa — dapat ngayong araw",
            "Ilagay ang Cash Sales na halaga (AED)",
            "Ilagay ang Card Sales na halaga — kasama dito ang POS, Link Payment, Visa, at Bank Transfer",
            "Ilagay ang Talabat Sales na halaga",
            "Ilagay ang Opening Cash (magkano ang cash sa drawer sa simula ng araw)",
            "Ilagay ang PT Cash Top-up KUNG nagpadala si Mohamed ng pera ngayong araw",
            "Idagdag ang bawat gastos — i-tap ang '+ Dagdagan ang Gastos', ilagay ang paglalarawan, halaga, at piliin ang kategorya (Gulay, Tinapay, Inumin, Panlinis, Iba pa)",
            "Ang Notes field ay para sa PROBLEMA LANG — void, refund, kulang na cash. Iwanang blangko kung walang problema",
            "Tignan ang summary sa ibaba: Kabuuan, Gastos, Net, Panghuling Cash",
            "I-tap ang 'Isumite ang Benta'",
            "Makikita mo ang huling 10 araw sa pamamagitan ng 'Mga Kamakailang Entry'",
          ],
          important: "Ang entry ngayong araw lang ang maaaring i-edit. Kung kailangang ayusin ang nakaraang araw, sabihin kay Mohamed.",
        },
        {
          icon: "📦",
          title: "Bilang ng Imbentaryo",
          steps: [
            "I-tap ang 'Imbentaryo' tab",
            "Piliin ang kategorya: Grocery, Packaging, o Kitchen/Frozen",
            "Gamitin ang search para mabilis makahanap ng item",
            "Para sa bawat item, ilagay ang bagong dami sa kahon",
            "I-tap ang 'I-update' para i-save",
            "Ang kulay ay nagpapakita ng status: BERDE = OK, DILAW = Mababa, PULA = Ubos na",
          ],
        },
        {
          icon: "🍳",
          title: "Log ng Produksyon",
          steps: [
            "I-tap ang 'Produksyon' tab",
            "Piliin ang ginawa mo (Samosa, Rolls, atbp.)",
            "Ilagay ang dami at yunit",
            "Magdagdag ng notes kung kailangan",
            "I-tap ang 'I-log ang Produksyon'",
            "Ang produksyon ngayong araw ay nasa ibaba",
          ],
        },
        {
          icon: "🚚",
          title: "Pagtanggap / Deliveries",
          steps: [
            "I-tap ang 'Pagtanggap' tab",
            "Ilagay ang pangalan ng supplier",
            "Idagdag ang bawat item na natanggap — pangalan, dami, yunit",
            "I-tap ang '+ Dagdagan' para sa dagdag na item",
            "Magdagdag ng notes tungkol sa delivery",
            "I-tap ang 'I-log ang Delivery'",
          ],
        },
        {
          icon: "⚠️",
          title: "Mahahalagang Panuntunan",
          steps: [
            "Isumite ang benta ng araw ARAW-ARAW bago magsara",
            "Notes = PROBLEMA LANG (void, refund, kulang na cash)",
            "Card = LAHAT ng uri ng card na pinagsama (POS + Link + Visa + Transfer)",
            "Bilangin ang imbentaryo nang tapat — huwag hulaan",
            "Kung may mali, sabihin agad kay Mohamed",
            "Huwag ibahagi ang iyong PIN kahit kanino",
          ],
        },
      ],
    },
  };

  const c = content[lang];

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-staff-text font-[family-name:var(--font-cairo)]">
          {c.title}
        </h2>
        <button
          onClick={() => setLang(lang === "en" ? "fil" : "en")}
          className="text-xs px-2 py-1 rounded bg-staff-bg border border-staff-border text-staff-text2"
        >
          {lang === "en" ? "FIL" : "EN"}
        </button>
      </div>

      {c.sections.map((section, i) => (
        <div
          key={i}
          className="bg-staff-card rounded-xl border border-staff-border p-4"
        >
          <h3 className="font-semibold text-staff-text mb-3 flex items-center gap-2">
            <span className="text-xl">{section.icon}</span>
            {section.title}
          </h3>
          <ol className="space-y-2 ml-2">
            {section.steps.map((step, j) => (
              <li key={j} className="flex gap-2 text-sm text-staff-text2">
                <span className="text-teal font-bold min-w-5">{j + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {"important" in section && section.important && (
            <div className="mt-3 bg-warning/10 border border-warning/20 rounded-lg p-2.5">
              <p className="text-xs text-warning font-medium">
                ⚠️ {section.important}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
