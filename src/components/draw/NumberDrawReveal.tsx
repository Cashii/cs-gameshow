"use client";

import { useEffect, useRef, useState } from "react";
import type { DrawGameState } from "@/lib/draw/types";
import "@/styles/draw-audience.css";

type DrawPresentation = {
  number: string | null;
  phase: "enter" | "visible" | "exit" | "empty";
  key: number;
};

export function NumberDrawReveal({
  draw,
}: Readonly<{ draw: DrawGameState }>) {
  const [presentation, setPresentation] = useState<DrawPresentation>(() => ({
    number: draw.number,
    phase: draw.number == null ? "empty" : "visible",
    key: draw.sequence,
  }));
  const observedRef = useRef({
    number: draw.number,
    sequence: draw.sequence,
  });

  useEffect(() => {
    const observed = observedRef.current;
    if (
      observed.number === draw.number &&
      observed.sequence === draw.sequence
    ) {
      return;
    }
    observedRef.current = {
      number: draw.number,
      sequence: draw.sequence,
    };

    const exitFrame = requestAnimationFrame(() => {
      setPresentation((current) =>
        current.number == null ? current : { ...current, phase: "exit" },
      );
    });

    const swapTimer = window.setTimeout(() => {
      setPresentation({
        number: draw.number,
        phase: draw.number == null ? "empty" : "enter",
        key: draw.sequence,
      });
    }, presentation.number == null ? 0 : 600);

    const settleTimer = window.setTimeout(
      () => {
        if (draw.number != null) {
          setPresentation((current) => ({ ...current, phase: "visible" }));
        }
      },
      presentation.number == null ? 1250 : 1850,
    );

    return () => {
      cancelAnimationFrame(exitFrame);
      clearTimeout(swapTimer);
      clearTimeout(settleTimer);
    };
  }, [draw.number, draw.sequence, presentation.number]);

  return (
    <div className="draw-audience">
      <div className="draw-label">Ticket Draw</div>
      {presentation.number == null ? (
        <div className="draw-waiting">Waiting for draw…</div>
      ) : (
        <div className={`draw-stage ${presentation.phase}`}>
          <div className="draw-burst" aria-hidden />
          <div
            key={presentation.key}
            className={`draw-number ${presentation.phase}`}
          >
            {presentation.number}
          </div>
        </div>
      )}
    </div>
  );
}
