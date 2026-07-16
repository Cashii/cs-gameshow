"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          boxSizing: "border-box",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #3a3a3a",
          background: "#2a2a2a",
          color: "#e5e5e5",
          fontSize: 14,
          lineHeight: "20px",
          fontWeight: 400,
          minWidth: 200,
          flex: 1,
          cursor: "pointer",
          minHeight: 38,
        }}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={14} aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          side="bottom"
          sideOffset={6}
          align="start"
          collisionPadding={8}
          style={{
            backgroundColor: "#1f1f1f",
            borderRadius: 8,
            border: "1px solid #3a3a3a",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.5)",
            zIndex: 10000,
            minWidth: "var(--radix-select-trigger-width)",
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  lineHeight: "18px",
                  cursor: "pointer",
                  outline: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#e5e5e5",
                }}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    marginLeft: 8,
                  }}
                >
                  <Check size={14} aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
