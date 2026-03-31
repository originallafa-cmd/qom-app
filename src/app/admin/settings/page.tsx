"use client";

import { useState, useEffect } from "react";

export default function AdminSettings() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [pinForm, setPinForm] = useState({ staffName: "", newPin: "" });
  const [pinMsg, setPinMsg] = useState("");
  const [pinMsgType, setPinMsgType] = useState<"success" | "error">("success");
  const [staffList, setStaffList] = useState<{ id: string; name: string; role: string }[]>([]);

  useEffect(() => {
    fetch("/api/auth/staff/list")
      .then((r) => r.json())
      .then((data) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function handleVaultSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/vault-sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Synced ${data.files.length} files to D:\\vault\\`);
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
    } catch {
      setSyncResult("Connection error");
    }
    setSyncing(false);
  }

  async function handleSetPin() {
    if (!pinForm.staffName || pinForm.newPin.length !== 4) return;
    setPinMsg("");
    try {
      const res = await fetch("/api/admin/staff-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pinForm),
      });
      if (res.ok) {
        setPinMsg(`PIN updated for ${pinForm.staffName}`);
        setPinMsgType("success");
        setPinForm({ staffName: "", newPin: "" });
      } else {
        const data = await res.json();
        setPinMsg(data.error || "Failed");
        setPinMsgType("error");
      }
    } catch {
      setPinMsg("Error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
        Settings
      </h1>

      {/* Vault Sync */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-5">
        <h3 className="text-sm font-semibold text-admin-text2 mb-2">Vault Sync</h3>
        <p className="text-xs text-admin-text3 mb-3">
          Export latest data to D:\vault\ for Obsidian backup. Generates session memo, sales data, inventory snapshot, and full export.
        </p>
        <button
          onClick={handleVaultSync}
          disabled={syncing}
          className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {syncing ? "Syncing..." : "Sync to Vault"}
        </button>
        {syncResult && (
          <p className={`text-sm mt-2 ${syncResult.includes("Error") ? "text-danger" : "text-success"}`}>
            {syncResult}
          </p>
        )}
      </div>

      {/* Staff PIN Management */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-5">
        <h3 className="text-sm font-semibold text-admin-text2 mb-2">Staff PIN Management</h3>
        <p className="text-xs text-admin-text3 mb-3">Change staff login PINs (4 digits)</p>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-admin-text3 mb-1">Staff Name</label>
            <select
              value={pinForm.staffName}
              onChange={(e) => setPinForm({ ...pinForm, staffName: e.target.value })}
              className="px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm"
            >
              <option value="">Select staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-admin-text3 mb-1">New PIN</label>
            <input
              type="text"
              maxLength={4}
              value={pinForm.newPin}
              onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="4 digits"
              className="w-24 px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm"
            />
          </div>
          <button
            onClick={handleSetPin}
            disabled={!pinForm.staffName || pinForm.newPin.length !== 4}
            className="px-4 py-2 bg-gold text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Set PIN
          </button>
        </div>
        {pinMsg && <p className={`text-sm mt-2 ${pinMsgType === "success" ? "text-success" : "text-danger"}`}>{pinMsg}</p>}
      </div>

      {/* App Info */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-5">
        <h3 className="text-sm font-semibold text-admin-text2 mb-2">App Info</h3>
        <div className="space-y-1 text-sm">
          <InfoRow label="Restaurant" value="Queen of Mahshi — ملكة المحشي" />
          <InfoRow label="Legal Name" value="ORIGINAL LAFA CAFETERIA LLC SPC" />
          <InfoRow label="Owners" value="Mohamed & Ahmed (50/50)" />
          <InfoRow label="POS" value="Sapaad" />
          <InfoRow label="Delivery" value="Talabat (28.3% total fee)" />
          <InfoRow label="Card Processor" value="Network International (2.26%)" />
          <InfoRow label="Bank" value="ADCB Islamic — 14333797820001" />
          <InfoRow label="Equity Reset" value="March 28, 2026" />
          <InfoRow label="MCP Endpoint" value="/api/mcp" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-admin-text3">{label}</span>
      <span className="text-admin-text">{value}</span>
    </div>
  );
}
