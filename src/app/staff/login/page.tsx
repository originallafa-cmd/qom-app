"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [lang, setLang] = useState<"en" | "fil">("en");
  const router = useRouter();

  const text = {
    en: {
      title: "Queen of Mahshi",
      subtitle: "Staff Login",
      enterPin: "Enter your 4-digit PIN",
      wrongPin: "Wrong PIN. Try again.",
      welcome: "Welcome,",
      redirecting: "Opening your dashboard...",
    },
    fil: {
      title: "Queen of Mahshi",
      subtitle: "Staff Login",
      enterPin: "Ilagay ang iyong 4-digit PIN",
      wrongPin: "Maling PIN. Subukan ulit.",
      welcome: "Maligayang pagdating,",
      redirecting: "Binubuksan ang dashboard...",
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
        const data = await res.json();
        setStaffName(data.name);
        setShowWelcome(true);
        setTimeout(() => {
          router.push("/staff/sales");
          router.refresh();
        }, 1500);
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

  // Welcome screen after successful login
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👋</span>
          </div>
          <p className="text-staff-text2 text-sm">{t.welcome}</p>
          <h2 className="text-2xl font-bold text-teal font-[family-name:var(--font-cairo)] mt-1">
            {staffName}
          </h2>
          <p className="text-staff-text2 text-sm mt-3">{t.redirecting}</p>
          <div className="mt-4 w-32 h-1 bg-staff-border rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-teal rounded-full animate-[loading_1.5s_ease-in-out]" style={{ animation: "loading 1.5s ease-in-out forwards" }} />
          </div>
          <style>{`@keyframes loading { from { width: 0% } to { width: 100% } }`}</style>
        </div>
      </div>
    );
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
