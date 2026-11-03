"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export const StackedIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode;
    label: string;
  }
>(function StackedIconButton(
  { icon, label, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex min-h-16 min-w-16 shrink-0 flex-col items-center justify-center gap-2.5 rounded-md px-2 py-3 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon}
      <span className="text-[10px] font-semibold leading-none tracking-wide uppercase">
        {label}
      </span>
    </button>
  );
});
