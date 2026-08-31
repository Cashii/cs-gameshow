"use client";

import React from "react";

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: React.ReactNode;
    onClick: () => void;
  }
>(({ label, onClick, disabled, style, ...props }, ref) => {
  const isIconOnly = React.isValidElement(label) && typeof label !== "string";
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      type="button"
      {...props}
      style={{
        padding: isIconOnly ? "6px 8px" : "8px 12px",
        borderRadius: 8,
        border: "1px solid var(--color-neutral-700)",
        background: disabled ? "var(--color-neutral-900)" : "var(--color-neutral-800)",
        color: disabled ? "var(--color-neutral-500)" : "var(--color-white)",
        cursor: disabled ? "not-allowed" : "pointer",
        marginRight: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 400,
        ...style,
      }}
    >
      {label}
    </button>
  );
});
IconButton.displayName = "IconButton";

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 200,
  disabled = false,
  style,
  className,
}: Readonly<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}>) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      className={className}
      onChange={(e) =>
        onChange(
          Math.max(min, Math.min(max, Number.parseInt(e.target.value || "0", 10))),
        )
      }
      style={{
        width: 60,
        height: 36,
        boxSizing: "border-box",
        padding: "0 8px",
        borderRadius: 8,
        border: "1px solid var(--color-neutral-700)",
        background: disabled ? "var(--color-neutral-900)" : "var(--color-neutral-800)",
        color: disabled ? "var(--color-neutral-500)" : "var(--color-white)",
        cursor: disabled ? "not-allowed" : "text",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    />
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  style,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}>) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        height: 36,
        boxSizing: "border-box",
        padding: "0 10px",
        borderRadius: 8,
        border: "1px solid var(--color-neutral-700)",
        background: "var(--color-neutral-800)",
        color: "var(--color-white)",
        ...(style || {}),
      }}
    />
  );
}
