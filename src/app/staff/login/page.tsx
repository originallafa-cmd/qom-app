"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export default function StaffLogin() {
  const [step, setStep] = useState<"select" | "pin" | "change" | "welcome">("select");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [lang, setLang] = useState<"en" | "fil">("en");
  const router = useRouter();

  // Fetch staff list on load
  useEffect(() => {
    fetch("/api/auth/staff/list")
      .then((r) => r.json())
      .then((data) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const t = lang === "en" ? {
    title: "Queen of Mahshi",
    whoAreYou: "Who's logging in?",
    enterPin: "Enter your PIN",
    wrongPin: "Wrong PIN. Try again.",
    welcome: "Welcome,",
    redirecting: "Opening your dashboard...",
    newPinTitle: "Set Your New PIN",
    newPinDesc: "Choose a 4-digit PIN only you know",
    newPin: "New PIN",
    confirmPin: "Confirm PIN",
    savePin: "Save PIN",
    pinMismatch: "PINs don't match",
    pinDigits: "PIN must be 4 digits",
    orManager: "Or enter manager PIN directly:",
  } : {
    title: "Queen of Mahshi",
    whoAreYou: "Sino ang maglo-login?",
    enterPin: "Ilagay ang iyong PIN",
    wrongPin: "Maling PIN. Subukan ulit.",
    welcome: "Maligayang pagdating,",
    redirecting: "Binubuksan ang dashboard...",
    newPinTitle: "Itakda ang Bagong PIN",
    newPinDesc: "Pumili ng 4-digit PIN na ikaw lang nakakaalam",
    newPin: "Bagong PIN",
    confirmPin: "Kumpirmahin",
    savePin: "I-save",
    pinMismatch: "Hindi tugma ang PIN",
    pinDigits: "Dapat 4 na numero",
    orManager: "O ilagay ang manager PIN:",
  };

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && (step === "pin" || step === "select")) {
      handlePinSubmit();
    }
  }, [pin]);

  async function handlePinSubmit() {
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
          setStep("change");
        } else {
          setStep("welcome");
          setTimeout(() => {
            router.push("/staff/dashboard");
            router.refresh();
          }, 1200);
        }
      } else {
        setError(t.wrongPin);
        setPin("");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  }

  async function handlePinChange() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError(t.pinDigits); return;
    }
    if (newPin !== confirmPin) {
      setError(t.pinMismatch); return;
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
        setStep("welcome");
        setTimeout(() => { router.push("/staff/dashboard"); router.refresh(); }, 1200);
      } else { setError("Failed"); }
    } catch { setError("Error"); }
    setLoading(false);
  }

  function handlePinInput(digit: string) {
    if (pin.length < 4) setPin((p) => p + digit);
  }

  // ─── Welcome Screen ───
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👋</span>
          </div>
          <p className="text-staff-text2 text-sm">{t.welcome}</p>
          <h2 className="text-2xl font-bold text-teal font-[family-name:var(--font-cairo)] mt-1">{staffName}</h2>
          {staffRole === "manager" && (
            <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full mt-2 inline-block">Manager</span>
          )}
          <div className="mt-6 w-32 h-1 bg-staff-border rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-teal rounded-full" style={{ animation: "loading 1.2s ease-in-out forwards" }} />
          </div>
          <style>{`@keyframes loading { from { width: 0% } to { width: 100% } }`}</style>
        </div>
      </div>
    );
  }

  // ─── PIN Change Screen ───
  if (step === "change") {
    return (
      <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-staff-card rounded-2xl shadow-lg border border-staff-border p-8 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <p className="text-staff-text2 text-sm">{t.welcome} <b className="text-teal">{staffName}</b></p>
          <h2 className="text-lg font-bold text-staff-text mt-2 mb-1">{t.newPinTitle}</h2>
          <p className="text-xs text-staff-text2 mb-6">{t.newPinDesc}</p>
          {error && <p className="text-danger text-sm mb-3">{error}</p>}
          <div className="space-y-3">
            <input type="password" inputMode="numeric" maxLength={4} value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="● ● ● ●" autoFocus
              className="w-full px-4 py-3 rounded-xl border border-staff-border bg-staff-bg text-staff-text text-center text-2xl tracking-widest" />
            <input type="password" inputMode="numeric" maxLength={4} value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="● ● ● ●"
              className="w-full px-4 py-3 rounded-xl border border-staff-border bg-staff-bg text-staff-text text-center text-2xl tracking-widest" />
            <button onClick={handlePinChange}
              disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full py-3 rounded-xl bg-teal text-white font-semibold text-lg disabled:opacity-40">
              {loading ? "..." : t.savePin}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PIN Entry Screen (after selecting staff) ───
  if (step === "pin" && selectedStaff) {
    return (
      <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-staff-card rounded-2xl shadow-lg border border-staff-border p-8 text-center">
            {/* Back button */}
            <button onClick={() => { setStep("select"); setPin(""); setError(""); setSelectedStaff(null); }}
              className="text-sm text-staff-text2 hover:text-staff-text mb-4 block">
              ← Back
            </button>

            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-teal">{selectedStaff.name[0]}</span>
            </div>
            <h2 className="text-lg font-bold text-staff-text mb-1">{selectedStaff.name}</h2>
            <p className="text-sm text-staff-text2 mb-6">{t.enterPin}</p>

            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  pin.length > i ? "border-teal bg-teal/10 text-teal scale-110" : "border-staff-border bg-staff-bg"
                }`}>
                  {pin.length > i ? "●" : ""}
                </div>
              ))}
            </div>

            {error && <p className="text-danger text-sm mb-3">{error}</p>}
            {loading && <p className="text-teal text-sm mb-3">Checking...</p>}

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} type="button" onClick={() => handlePinInput(String(n))}
                  className="h-12 rounded-xl bg-staff-bg border border-staff-border text-xl font-semibold text-staff-text hover:bg-teal/10 active:scale-95 transition-all">
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setPin((p) => p.slice(0, -1))}
                className="h-12 rounded-xl bg-staff-bg border border-staff-border text-lg text-staff-text2 hover:bg-danger/10">←</button>
              <button type="button" onClick={() => handlePinInput("0")}
                className="h-12 rounded-xl bg-staff-bg border border-staff-border text-xl font-semibold text-staff-text hover:bg-teal/10 active:scale-95">0</button>
              <div />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Staff Selection Screen (default) ───
  return (
    <div className="min-h-screen bg-staff-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setLang(lang === "en" ? "fil" : "en")}
            className="text-sm text-staff-text2 px-3 py-1 rounded-lg bg-staff-card border border-staff-border">
            {lang === "en" ? "Filipino" : "English"}
          </button>
        </div>

        <div className="bg-staff-card rounded-2xl shadow-lg border border-staff-border p-6 text-center">
          <h1 className="text-2xl font-bold text-teal font-[family-name:var(--font-cairo)] mb-1">{t.title}</h1>
          <p className="text-staff-text2 text-sm mb-6">{t.whoAreYou}</p>

          {/* Staff name buttons */}
          <div className="space-y-2 mb-6">
            {staffList.filter((s) => s.role === "staff").map((staff) => (
              <button
                key={staff.id}
                onClick={() => { setSelectedStaff(staff); setStep("pin"); setPin(""); setError(""); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-staff-border bg-staff-bg hover:bg-teal/5 hover:border-teal/30 transition-all text-left"
              >
                <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-teal">{staff.name[0]}</span>
                </div>
                <span className="text-sm font-medium text-staff-text">{staff.name}</span>
              </button>
            ))}
          </div>

          {/* Manager direct PIN entry */}
          <div className="border-t border-staff-border pt-4">
            <p className="text-xs text-staff-text2 mb-2">{t.orManager}</p>
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="● ● ● ●"
                className="flex-1 px-4 py-2.5 rounded-xl border border-staff-border bg-staff-bg text-staff-text text-center text-lg tracking-widest"
              />
            </div>
            {error && step === "select" && <p className="text-danger text-xs mt-2">{error}</p>}
            {loading && step === "select" && <p className="text-teal text-xs mt-2">Checking...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
