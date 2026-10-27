"use client";

import { RotateCcw } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function ResetButton({
  children,
  className,
  type = "button",
  tone = "danger",
  ...props
}: Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "danger" | "orange";
  }
>) {
  const toneClass =
    tone === "orange"
      ? "border-orange-500 bg-orange-600 hover:bg-orange-500"
      : "border-red-500 bg-red-600 hover:bg-red-700";
  return (
    <button
      type={type}
      {...props}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40",
        toneClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <RotateCcw size={16} />
      {children}
    </button>
  );
}
