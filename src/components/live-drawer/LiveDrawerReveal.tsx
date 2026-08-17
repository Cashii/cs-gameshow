"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLiveDrawerColor,
  type LiveDrawerGameState,
} from "@/lib/live-drawer/types";
import "@/styles/live-drawer-audience.css";

type LiveDrawerPresentation = {
  number: string | null;
  colorHex: string | null;
  phase: "enter" | "visible" | "exit" | "empty";
  key: number;
};

export function LiveDrawerReveal({
  game,
}: Readonly<{ game: LiveDrawerGameState }>) {
  const activeColor = getLiveDrawerColor(game.colorId);
  const [presentation, setPresentation] = useState<LiveDrawerPresentation>(
    () => ({
      number: game.number,
      colorHex: activeColor?.hex ?? null,
      phase: game.number == null ? "empty" : "visible",
      key: game.sequence,
    }),
  );
  const observedRef = useRef({
    number: game.number,
    sequence: game.sequence,
    colorId: game.colorId,
  });

  useEffect(() => {
    const observed = observedRef.current;
    if (
      observed.number === game.number &&
      observed.sequence === game.sequence &&
      observed.colorId === game.colorId
    ) {
      return;
    }

    const hadNumber = observed.number != null;
    const nextColor = getLiveDrawerColor(game.colorId);
    const swapDelay = hadNumber ? 600 : 0;
    const settleDelay = hadNumber ? 1850 : 1250;
    let cancelled = false;

    const exitFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      setPresentation((current) =>
        current.number == null ? current : { ...current, phase: "exit" },
      );
    });

    const swapTimer = window.setTimeout(() => {
      if (cancelled) return;
      observedRef.current = {
        number: game.number,
        sequence: game.sequence,
        colorId: game.colorId,
      };
      setPresentation({
        number: game.number,
        colorHex: nextColor?.hex ?? null,
        phase: game.number == null ? "empty" : "enter",
        key: game.sequence,
      });
    }, swapDelay);

    const settleTimer = window.setTimeout(() => {
      if (cancelled || game.number == null) return;
      setPresentation((current) =>
        current.key === game.sequence
          ? { ...current, phase: "visible" }
          : current,
      );
    }, settleDelay);

    return () => {
      cancelled = true;
      cancelAnimationFrame(exitFrame);
      clearTimeout(swapTimer);
      clearTimeout(settleTimer);
    };
  }, [game.number, game.sequence, game.colorId]);

  const themeStyle = {
    "--live-drawer-text-scale": String(game.numberScale ?? 1),
    ...(presentation.colorHex != null
      ? {
          "--live-drawer-bg": presentation.colorHex,
          "--live-drawer-glow": presentation.colorHex,
          "--live-drawer-glow-soft": presentation.colorHex,
        }
      : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`live-drawer-audience${presentation.colorHex ? " has-color" : ""}`}
      style={themeStyle}
    >
      {presentation.number == null ? (
        <div className="live-drawer-waiting">
          <div className="live-drawer-waiting-orb" aria-hidden />
          <span>
            Waiting for draw
            <span className="live-drawer-waiting-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </span>
        </div>
      ) : (
        <div className={`live-drawer-stage ${presentation.phase}`}>
          <div className="live-drawer-burst" aria-hidden />
          <div
            key={presentation.key}
            className={`live-drawer-text ${presentation.phase}`}
          >
            {presentation.number}
          </div>
        </div>
      )}
    </div>
  );
}
