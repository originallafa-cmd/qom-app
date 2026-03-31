"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("Invalid password");
        setPassword("");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link href="/" className="text-sm text-admin-text3 hover:text-admin-text2">← Home</Link>
        </div>
        <div className="bg-admin-card rounded-2xl border border-admin-border p-8 text-center">
          <h1 className="text-3xl font-bold text-gold font-[family-name:var(--font-cairo)] mb-1">
            ملكة المحشي
          </h1>
          <p className="text-admin-text2 mb-8">Admin Portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="admin-pw" className="sr-only">Password</label>
            <input
              id="admin-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-admin-bg border border-admin-border text-admin-text text-center text-lg focus:outline-none focus:border-gold"
            />

            {error && <p className="text-danger text-sm">{error}</p>}

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full py-3 rounded-xl bg-gold text-white font-semibold text-lg hover:bg-gold-dark transition-colors disabled:opacity-40"
            >
              {loading ? "..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
