"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { type ReactElement, type ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  children,
  content,
  side = "top",
  delayDuration,
  size = "sm",
}: {
  children: ReactElement;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  size?: "sm" | "md";
}) {
  const large = size === "md";
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={5}
          avoidCollisions
          style={{
            backgroundColor: "var(--color-neutral-900)",
            color: "var(--color-neutral-100)",
            padding: large ? "8px 14px" : "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--color-neutral-600)",
            fontSize: large ? 16 : 12,
            fontWeight: 500,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 99999,
            maxWidth: large ? "280px" : "200px",
            pointerEvents: "none",
          }}
        >
          {content}
          <TooltipPrimitive.Arrow style={{ fill: "var(--color-neutral-900)" }} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
