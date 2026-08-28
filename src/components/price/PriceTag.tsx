"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/price/format";

export function PriceTag({
  price,
  revealed,
  size = "md",
}: Readonly<{
  price: number | null;
  revealed: boolean;
  size?: "sm" | "md" | "lg";
}>) {
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (!revealed) {
      setPop(false);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    setPop(true);
    const timer = window.setTimeout(() => setPop(false), 420);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const sizeClass =
    size === "lg" ? " price-tag-lg" : size === "sm" ? " price-tag-sm" : "";

  return (
    <div
      className={`price-tag${sizeClass}${revealed ? " price-tag-revealed" : " price-tag-hidden"}${
        pop ? " price-tag-popping" : ""
      }`}
      aria-label={revealed ? formatPrice(price) : "Price hidden"}
    >
      <span className="price-tag-face">
        {revealed ? formatPrice(price) : "???"}
      </span>
    </div>
  );
}
