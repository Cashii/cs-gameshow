"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

const DURATION_MS = 450;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function measureMoveNodes(root: HTMLElement): Map<string, DOMRect> {
  const next = new Map<string, DOMRect>();
  for (const node of root.querySelectorAll<HTMLElement>("[data-price-move]")) {
    const id = node.dataset.priceMove;
    if (id) next.set(id, node.getBoundingClientRect());
  }
  return next;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playMoveAnimation(
  node: HTMLElement,
  first: DOMRect | undefined,
  last: DOMRect,
): void {
  for (const animation of node.getAnimations()) {
    animation.cancel();
  }

  if (!first) {
    node.animate(
      [
        { opacity: 0, transform: "scale(0.84)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: DURATION_MS, easing: EASING },
    );
    return;
  }

  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = first.width / Math.max(last.width, 1);
  const sy = first.height / Math.max(last.height, 1);
  if (
    Math.abs(dx) < 1 &&
    Math.abs(dy) < 1 &&
    Math.abs(sx - 1) < 0.02 &&
    Math.abs(sy - 1) < 0.02
  ) {
    return;
  }

  node.style.zIndex = "3";
  const animation = node.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: "none" },
    ],
    { duration: DURATION_MS, easing: EASING },
  );
  void animation.finished.finally(() => {
    if (node.style.zIndex === "3") node.style.zIndex = "";
  });
}

export function usePriceItemLayoutAnimation(
  layoutKey: string,
): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef(new Map<string, DOMRect>());
  const primed = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const next = measureMoveNodes(root);
    if (!primed.current || prefersReducedMotion()) {
      primed.current = true;
      prevRects.current = next;
      return;
    }

    for (const node of root.querySelectorAll<HTMLElement>("[data-price-move]")) {
      const id = node.dataset.priceMove;
      const last = id ? next.get(id) : undefined;
      if (!id || !last) continue;
      playMoveAnimation(node, prevRects.current.get(id), last);
    }

    prevRects.current = next;
  }, [layoutKey]);

  return rootRef;
}
