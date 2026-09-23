"use client";

import { useLayoutEffect, useRef } from "react";

export function ItemCurtain({ open }: Readonly<{ open: boolean }>) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Remounts (shelf ↔ slot moves) must snap to the real open/closed pose.
  // Otherwise CSS transitions replay and a closed curtain can flash open then shut.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.classList.add("price-curtain-instant");
    void el.offsetWidth;
    const frame = requestAnimationFrame(() => {
      el.classList.remove("price-curtain-instant");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={rootRef}
      className={`price-curtain${open ? " price-curtain-open" : ""}`}
      aria-hidden
    >
      <div className="price-curtain-valance" />
      <div className="price-curtain-panel price-curtain-left" />
      <div className="price-curtain-panel price-curtain-right" />
    </div>
  );
}
