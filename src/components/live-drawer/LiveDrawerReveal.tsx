"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getLiveDrawerColor,
  liveDrawerHexLuminance,
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

const BALL_INSET = { 1: 0.15, 2: 0.15, 3: 0.15, 4: 0.15 } as const;

function digitCount(value: string): keyof typeof BALL_INSET {
  const length = Math.min(4, Math.max(1, value.trim().length)) as 1 | 2 | 3 | 4;
  return length;
}

function fitNumberInBall(ball: HTMLElement): void {
  const num = ball.querySelector<HTMLElement>(".live-drawer-ball-num");
  if (!num) return;
  const size = Math.min(ball.clientWidth, ball.clientHeight);
  if (size < 8) return;
  const digits = digitCount(num.textContent ?? "1");
  const max = size * (1 - 2 * BALL_INSET[digits]);
  let lo = 8;
  let hi = size;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    num.style.fontSize = `${mid}px`;
    const fits = num.scrollWidth <= max + 1 && num.scrollHeight <= max + 1;
    if (fits) lo = mid;
    else hi = mid;
  }
  num.style.fontSize = `${lo * 0.96}px`;
}

function LiveDrawerFittedNumbers({
  tokens,
  phase,
  numberScale,
  sequence,
}: Readonly<{
  tokens: LiveDrawerToken[];
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
    text.querySelectorAll<HTMLElement>(".live-drawer-ball").forEach(fitNumberInBall);
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
      <div ref={textRef} className={`live-drawer-balls ${phase}`}>
        {tokens.map((token, i) => {
          const color = getLiveDrawerColor(token.colorId);
          return (
            <span
              key={token.id}
              className="live-drawer-ball"
              data-digits={String(digitCount(token.number))}
              data-ink={color && liveDrawerHexLuminance(color.hex) > 0.55 ? "dark" : "light"}
              data-fill={color?.id ?? "unknown"}
              style={{
                backgroundColor: color?.hex ?? "#334155",
                color: color?.ink ?? "#ffffff",
                animationDelay: `${i * 120}ms`,
              }}
            >
              <span className="live-drawer-ball-num">{token.number}</span>
            </span>
          );
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

  const themeStyle = {
    "--live-drawer-text-scale": String(game.numberScale ?? 1),
  } as React.CSSProperties;

  return (
    <div className="live-drawer-audience" style={themeStyle}>
      {phase === "empty" || displayTokens.length === 0 ? (
        <LiveDrawerWaitingReel />
      ) : (
        <div className={`live-drawer-stage ${phase}`}>
          <div className="live-drawer-burst" aria-hidden />
          <LiveDrawerFittedNumbers
            tokens={displayTokens}
            phase={phase}
            numberScale={game.numberScale ?? 1}
            sequence={game.sequence}
          />
        </div>
      )}
    </div>
  );
}
