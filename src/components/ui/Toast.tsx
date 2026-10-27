"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastTone = "neutral" | "error";

export function useToast(durationMs = 3500) {
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(timer);
  }, [toast, durationMs]);

  const showToast = useCallback((text: string, tone: ToastTone = "neutral") => {
    setToast({ message: text, tone });
  }, []);

  return {
    toastMessage: toast?.message ?? null,
    toastTone: toast?.tone ?? "neutral",
    showToast,
  };
}

export function Toast({
  message,
  tone = "neutral",
}: Readonly<{ message: string | null; tone?: ToastTone }>) {
  if (!message) return null;
  const toneClass =
    tone === "error"
      ? "border-red-400 bg-red-50 text-red-800"
      : "border-neutral-300 bg-neutral-100 text-neutral-900";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`fixed right-4 bottom-4 z-[2000] max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-xl ${toneClass}`}
    >
      {message}
    </div>
  );
}
