"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<1 | 2>(1);
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
        setStaffRole(data.role);

        if (data.mustChangePin) {
          setShowChangePin(true);
        } else {
          setShowWelcome(true);
          setTimeout(() => {
            router.push("/staff/dashboard");
            router.refresh();
          }, 1500);
        }
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

  // PIN change screen (first login)
  async function handlePinChange() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError(lang === "en" ? "PIN must be 4 digits" : "Dapat 4 na numero ang PIN");
      return;
    }
    if (newPin !== confirmPin) {
      setError(lang === "en" ? "PINs don't match" : "Hindi tugma ang PIN");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/staff/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin }),
      });
      if (res.ok) {
        setShowChangePin(false);
        setShowWelcome(true);
        setTimeout(() => {
          router.push("/staff/dashboard");
          router.refresh();
        }, 1500);
      } else {
        setError("Failed to change PIN");
      }
    } catch { setError("Connection error"); }
    setLoading(false);
  }

  if (showChangePin) {
    return (
      <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-staff-card rounded-2xl shadow-lg border border-staff-border p-8 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <p className="text-staff-text2 text-sm">{lang === "en" ? "Welcome," : "Maligayang pagdating,"} <b className="text-teal">{staffName}</b></p>
          <h2 className="text-lg font-bold text-staff-text font-[family-name:var(--font-cairo)] mt-2 mb-1">
            {lang === "en" ? "Set Your New PIN" : "Itakda ang Bagong PIN"}
          </h2>
          <p className="text-xs text-staff-text2 mb-6">
            {lang === "en" ? "Choose a 4-digit PIN that only you know" : "Pumili ng 4-digit PIN na ikaw lang ang nakakaalam"}
          </p>

          {error && <p className="text-danger text-sm mb-3">{error}</p>}

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-staff-text2 mb-1 text-left">
                {lang === "en" ? "New PIN" : "Bagong PIN"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="● ● ● ●"
                className="w-full px-4 py-3 rounded-xl border border-staff-border bg-staff-bg text-staff-text text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-staff-text2 mb-1 text-left">
                {lang === "en" ? "Confirm PIN" : "Kumpirmahin ang PIN"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="● ● ● ●"
                className="w-full px-4 py-3 rounded-xl border border-staff-border bg-staff-bg text-staff-text text-center text-2xl tracking-widest"
              />
            </div>
            <button
              onClick={handlePinChange}
              disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full py-3 rounded-xl bg-teal text-white font-semibold text-lg disabled:opacity-40"
            >
              {loading ? "..." : lang === "en" ? "Save PIN" : "I-save ang PIN"}
            </button>
          </div>
        </div>
      </div>
    );
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
          {staffRole === "manager" && (
            <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full mt-1 inline-block">Manager</span>
          )}
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
