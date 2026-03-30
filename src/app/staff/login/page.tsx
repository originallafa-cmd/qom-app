"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"en" | "fil">("en");
  const router = useRouter();

  const text = {
    en: {
      title: "Queen of Mahshi",
      subtitle: "Staff Login",
      enterPin: "Enter your 4-digit PIN",
      login: "Login",
      wrongPin: "Wrong PIN. Try again.",
    },
    fil: {
      title: "Queen of Mahshi",
      subtitle: "Staff Login",
      enterPin: "Ilagay ang iyong 4-digit PIN",
      login: "Mag-login",
      wrongPin: "Maling PIN. Subukan ulit.",
    },
  };

  const t = text[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push("/staff/sales");
        router.refresh();
      } else {
        setError(t.wrongPin);
        setPin("");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  function handlePinInput(digit: string) {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === "en" ? "fil" : "en")}
            className="text-sm text-staff-text2 hover:text-staff-text px-3 py-1 rounded-lg bg-staff-card border border-staff-border"
          >
            {lang === "en" ? "Filipino" : "English"}
          </button>
        </div>

        <div className="bg-staff-card rounded-2xl shadow-lg border border-staff-border p-8 text-center">
          <h1 className="text-2xl font-bold text-teal font-[family-name:var(--font-cairo)] mb-1">
            {t.title}
          </h1>
          <p className="text-staff-text2 mb-8">{t.subtitle}</p>

          <form onSubmit={handleSubmit}>
            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                    pin.length > i
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-staff-border bg-staff-bg text-staff-text2"
                  }`}
                >
                  {pin.length > i ? "●" : ""}
                </div>
              ))}
            </div>

            <p className="text-sm text-staff-text2 mb-4">{t.enterPin}</p>

            {error && (
              <p className="text-danger text-sm mb-4 font-medium">{error}</p>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePinInput(String(n))}
                  className="h-14 rounded-xl bg-staff-bg border border-staff-border text-xl font-semibold text-staff-text hover:bg-teal/10 hover:border-teal transition-colors active:scale-95"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-xl bg-staff-bg border border-staff-border text-lg text-staff-text2 hover:bg-danger/10 hover:border-danger transition-colors"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => handlePinInput("0")}
                className="h-14 rounded-xl bg-staff-bg border border-staff-border text-xl font-semibold text-staff-text hover:bg-teal/10 hover:border-teal transition-colors active:scale-95"
              >
                0
              </button>
              <button
                type="submit"
                disabled={pin.length !== 4 || loading}
                className="h-14 rounded-xl bg-teal text-white font-semibold text-lg hover:bg-teal-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "..." : "→"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
