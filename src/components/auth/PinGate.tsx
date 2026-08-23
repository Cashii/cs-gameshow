"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AppRole } from "@/lib/auth/session";

type PinGateProps = {
  role: AppRole;
  title: string;
  children: ReactNode;
};

export function PinGate({ role, title, children }: PinGateProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/auth?role=${role}`)
      .then((r) => r.json())
      .then((data: { authenticated: boolean; role?: AppRole }) => {
        setAuthenticated(data.authenticated && data.role === role);
      })
      .catch(() => setAuthenticated(false));
  }, [role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid PIN");
        return;
      }
      setAuthenticated(true);
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-neutral-950 text-neutral-400">
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-neutral-950 px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl"
        >
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm text-neutral-400">Enter your PIN to continue</p>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-6 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-center text-2xl tracking-widest text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            placeholder="••••"
          />
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="mt-6 w-full rounded-lg bg-sky-600 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
