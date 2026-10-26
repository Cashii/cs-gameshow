"use client";

import { RotateCcw } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function ResetButton({
  children,
  className,
  type = "button",
  ...props
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      type={type}
      {...props}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40",
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
