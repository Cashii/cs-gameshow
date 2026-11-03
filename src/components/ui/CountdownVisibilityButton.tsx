"use client";

import { Eye, EyeOff } from "lucide-react";

export function CountdownVisibilityButton({
  visible,
  onClick,
  disabled,
}: Readonly<{
  visible: boolean;
  onClick: () => void;
  disabled?: boolean;
}>) {
  const label = visible ? "Hide countdown" : "Show countdown";
  return (
    <button
      type="button"
      aria-pressed={visible}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-sky-500 bg-transparent px-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
    >
      {visible ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
      {label}
    </button>
  );
}
