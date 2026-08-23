"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getLiveDrawerColor,
  type LiveDrawerGameState,
  type LiveDrawerToken,
} from "@/lib/live-drawer/types";
import "@/styles/live-drawer-audience.css";

type Phase = "enter" | "visible" | "exit" | "empty";

const WAITING_MAX = 100;
const WAITING_ROLL_MS = 1000;
const WAITING_HOLD_MIN_MS = 450;
const WAITING_HOLD_MAX_MS = 1400;
const WAITING_MIN_JUMP = 9;

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function randomWaitingNumber(exclude: number): number {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const next = randomInt(WAITING_MAX);
    const jump = Math.abs(next - exclude);
    const wrapJump = Math.min(jump, WAITING_MAX - jump);
    if (next !== exclude && wrapJump >= WAITING_MIN_JUMP) {
      return next;
    }
  }
  return (exclude + 37) % WAITING_MAX;
}

function nextWaitingHold(): number {
  return WAITING_HOLD_MIN_MS + randomInt(WAITING_HOLD_MAX_MS - WAITING_HOLD_MIN_MS + 1);
}

function LiveDrawerWaitingReel() {
  const [index, setIndex] = useState(() => randomInt(WAITING_MAX));
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setSpinning(!media.matches);
    syncMotion();
    media.addEventListener("change", syncMotion);
    return () => media.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    if (!spinning) return;
    let timer = 0;
    const tick = () => {
      setIndex((prev) => randomWaitingNumber(prev));
      timer = window.setTimeout(tick, WAITING_ROLL_MS + nextWaitingHold());
    };
    timer = window.setTimeout(tick, WAITING_ROLL_MS + nextWaitingHold());
    return () => window.clearTimeout(timer);
  }, [spinning]);

  const display = String(index).padStart(2, "0");

  return (
    <div className="live-drawer-waiting">
      <div className="live-drawer-waiting-reel" aria-hidden={!spinning}>
        <span key={index} className="live-drawer-waiting-mark">
          {display}
        </span>
      </div>
      <p className="live-drawer-waiting-label">
        Waiting for draw
        <span className="live-drawer-waiting-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </p>
    </div>
  );
}

function LiveDrawerFittedNumbers({
  tokens,
  mixedColors,
  phase,
  numberScale,
  sequence,
}: Readonly<{
  tokens: LiveDrawerToken[];
  mixedColors: boolean;
  phase: Phase;
  numberScale: number;
  sequence: number;
}>) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const maxW = box.clientWidth;
    const maxH = box.clientHeight;
    if (maxW < 8 || maxH < 8) return;

    let lo = 12;
    let hi = Math.max(lo, Math.min(maxW, maxH) * 1.2 * numberScale);
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      text.style.fontSize = `${mid}px`;
      const fits =
        text.scrollWidth <= maxW + 1 && text.scrollHeight <= maxH + 1;
      if (fits) lo = mid;
      else hi = mid;
    }
    text.style.fontSize = `${lo}px`;
  }, [numberScale]);

  useLayoutEffect(() => {
    fit();
    const id = window.requestAnimationFrame(() => fit());
    const box = boxRef.current;
    if (!box) return () => window.cancelAnimationFrame(id);
    const observer = new ResizeObserver(() => fit());
    observer.observe(box);
    return () => {
      window.cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [fit, tokens, sequence, phase]);

  return (
    <div ref={boxRef} className="live-drawer-fit">
      <div
        ref={textRef}
        className={`live-drawer-text ${phase}${mixedColors ? " is-mixed" : ""}`}
      >
        {tokens.flatMap((token, i) => {
          const color = getLiveDrawerColor(token.colorId);
          const digit = (
            <span
              key={token.id}
              className="live-drawer-digit"
              style={{
                ...(mixedColors && color ? { color: color.hex } : {}),
                animationDelay: `${i * 120}ms`,
              }}
            >
              {token.number}
            </span>
          );
          if (i === 0) return [digit];
          return [
            <span
              key={`${token.id}-sep`}
              className="live-drawer-sep"
              style={{ animationDelay: `${i * 120 - 40}ms` }}
            >
              ,
            </span>,
            digit,
          ];
        })}
      </div>
    </div>
  );
}

export function LiveDrawerReveal({
  game,
}: Readonly<{ game: LiveDrawerGameState }>) {
  const tokens = game.revealedTokens;
  const [phase, setPhase] = useState<Phase>(
    tokens.length === 0 ? "empty" : "visible",
  );
  const [displayTokens, setDisplayTokens] = useState<LiveDrawerToken[]>(tokens);
  const tokenKey = tokens.map((t) => t.id).join(",");
  const observedRef = useRef({
    sequence: game.sequence,
    count: tokens.length,
    tokenKey,
  });

  useEffect(() => {
    const observed = observedRef.current;
    if (
      observed.sequence === game.sequence &&
      observed.count === tokens.length &&
      observed.tokenKey === tokenKey
    ) {
      return;
    }

    const hadTokens = observed.count > 0;
    const swapDelay = hadTokens ? 600 : 0;
    const settleDelay = hadTokens ? 1850 : 1250;
    let cancelled = false;

    const exitFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      if (hadTokens) setPhase("exit");
    });

    const swapTimer = window.setTimeout(() => {
      if (cancelled) return;
      observedRef.current = {
        sequence: game.sequence,
        count: tokens.length,
        tokenKey,
      };
      setDisplayTokens(tokens);
      setPhase(tokens.length === 0 ? "empty" : "enter");
    }, swapDelay);

    const settleTimer = window.setTimeout(() => {
      if (cancelled || tokens.length === 0) return;
      setPhase("visible");
    }, settleDelay);

    return () => {
      cancelled = true;
      cancelAnimationFrame(exitFrame);
      clearTimeout(swapTimer);
      clearTimeout(settleTimer);
    };
  }, [game.sequence, tokenKey, tokens]);

  const uniqueColorIds = [
    ...new Set(displayTokens.map((token) => token.colorId)),
  ];
  const mixedColors = uniqueColorIds.length > 1;
  const accent =
    !mixedColors && displayTokens.length > 0
      ? getLiveDrawerColor(displayTokens[0]!.colorId)
      : null;
  const rainbowStops = mixedColors
    ? (() => {
        const hexes = uniqueColorIds
          .map((id) => getLiveDrawerColor(id)?.hex)
          .filter((hex): hex is string => Boolean(hex));
        return hexes.length > 0 ? [...hexes, hexes[0]].join(", ") : "";
      })()
    : "";

  const themeStyle = {
    "--live-drawer-text-scale": String(game.numberScale ?? 1),
    ...(accent
      ? {
          "--live-drawer-bg": accent.hex,
          "--live-drawer-glow": accent.hex,
          "--live-drawer-glow-soft": accent.hex,
        }
      : {}),
    ...(mixedColors ? { "--live-drawer-rainbow": rainbowStops } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`live-drawer-audience${accent ? " has-color" : ""}${
        mixedColors ? " has-rainbow" : ""
      }`}
      style={themeStyle}
    >
      {phase === "empty" || displayTokens.length === 0 ? (
        <LiveDrawerWaitingReel />
      ) : (
        <div className={`live-drawer-stage ${phase}`}>
          <div className="live-drawer-burst" aria-hidden />
          <LiveDrawerFittedNumbers
            tokens={displayTokens}
            mixedColors={mixedColors}
            phase={phase}
            numberScale={game.numberScale ?? 1}
            sequence={game.sequence}
          />
        </div>
      )}
    </div>
  );
}
