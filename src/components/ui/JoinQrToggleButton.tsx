"use client";

import { QrCode } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function JoinQrToggleButton({
  active,
  showLabel = "Show QR code",
  hideLabel = "Hide QR code",
  className,
  type = "button",
  ...props
}: Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active: boolean;
    showLabel?: string;
    hideLabel?: string;
  }
>) {
  return (
    <button
      type={type}
      {...props}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-2 rounded-md border font-semibold disabled:opacity-50",
        "h-10 px-4 text-sm",
        active
          ? "border-sky-500 bg-sky-600 text-white hover:bg-sky-500"
          : "border-sky-500 bg-transparent text-sky-300 hover:bg-sky-500/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <QrCode size={16} />
      {active ? hideLabel : showLabel}
    </button>
  );
}
