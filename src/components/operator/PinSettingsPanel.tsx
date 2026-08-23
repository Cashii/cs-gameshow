"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function PinSettingsPanel({
  open,
  onOpenChange,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [operator, setOperator] = useState("");
  const [hostess, setHostess] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setOperator("");
    setHostess("");
    setMessage("");
    setLoading(false);
  };

  const handleSave = async () => {
    const payload: Record<string, string> = {};
    if (operator.trim()) payload.operator = operator.trim();
    if (hostess.trim()) payload.hostess = hostess.trim();
    if (Object.keys(payload).length === 0) {
      setMessage("Enter at least one new PIN");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/pins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed");
      }
      setMessage("PINs updated");
      setOperator("");
      setHostess("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update PINs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-1000 bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-1001 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="m-0 text-lg font-semibold text-white">
                PIN Settings
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-400">
                Default PINs on first run: operator 1234, hostess 5678. Players
                and spectators do not use a PIN.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["operator", operator, setOperator],
                ["hostess", hostess, setHostess],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="block">
                <span className="text-xs font-semibold text-neutral-400 uppercase">
                  {label}
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder="New PIN"
                  className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
                />
              </label>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            {message && (
              <p className="mr-auto text-sm text-neutral-300">{message}</p>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200"
              >
                Close
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Update PINs"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
