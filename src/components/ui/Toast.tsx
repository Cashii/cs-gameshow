"use client";

import { useCallback, useEffect, useState } from "react";

export function useToast(durationMs = 3500) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  const showToast = useCallback((text: string) => {
    setMessage(text);
  }, []);

  return { toastMessage: message, showToast };
}

export function Toast({ message }: Readonly<{ message: string | null }>) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed right-4 bottom-4 z-[2000] max-w-sm rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-xl"
    >
      {message}
    </div>
  );
}
