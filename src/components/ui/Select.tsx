"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className = "",
  compact = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  compact?: boolean;
  "aria-label"?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={`inline-flex w-full min-w-0 items-center justify-between text-left font-normal text-white outline-none hover:bg-neutral-700 focus-visible:border-sky-500 data-placeholder:text-neutral-400 ${
          compact
            ? "gap-2 rounded-md border border-neutral-700 bg-neutral-800 py-1 pr-2 pl-2 text-xs"
            : "h-9 gap-2 rounded-lg border border-neutral-700 bg-neutral-800 py-0 pr-3 pl-3 text-base"
        } ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="shrink-0 text-neutral-400">
          <ChevronDown size={16} aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          side="bottom"
          sideOffset={6}
          align="start"
          collisionPadding={8}
          className="z-10000 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl"
          style={{ minWidth: "var(--radix-select-trigger-width)" }}
        >
          <SelectPrimitive.Viewport className="max-h-72 p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-neutral-200 outline-none select-none data-highlighted:bg-neutral-700 data-highlighted:text-white data-[state=checked]:text-white"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="inline-flex shrink-0 text-sky-400">
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
