"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

const DURATION_MS = 500;
const EASING = "cubic-bezier(0.4, 0.05, 0.2, 1)";

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

function sameIdSet(a: Map<string, DOMRect>, b: Map<string, DOMRect>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a.keys()) {
    if (!b.has(id)) return false;
  }
  return true;
}

function playMoveAnimation(
  node: HTMLElement,
  first: DOMRect | undefined,
  last: DOMRect,
): void {
  for (const animation of node.getAnimations()) {
    animation.cancel();
  }

  node.classList.add("price-moving");
  const clearMoving = () => {
    node.classList.remove("price-moving");
    if (node.style.zIndex === "3") node.style.zIndex = "";
  };

  if (!first) {
    const animation = node.animate(
      [
        { opacity: 0, transform: "scale(0.84)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: DURATION_MS, easing: EASING },
    );
    void animation.finished.finally(clearMoving);
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
    clearMoving();
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
  void animation.finished.finally(clearMoving);
}

export function usePriceItemLayoutAnimation<T extends HTMLElement = HTMLDivElement>(
  layoutKey: string,
): RefObject<T | null> {
  const rootRef = useRef<T>(null);
  const prevRects = useRef(new Map<string, DOMRect>());
  const primed = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const next = measureMoveNodes(root);
    const sameItems = sameIdSet(prevRects.current, next);
    // Adding or removing items just updates the row. Only a rearrange
    // (including the answer sort) slides items that were already on screen.
    if (!primed.current || prefersReducedMotion() || !sameItems) {
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
