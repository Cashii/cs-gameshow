"use client";

import { useEffect, useState } from "react";
import {
  formatPictionaryClock,
  pictionaryRemainingMs,
  type PictionaryState,
} from "@/lib/pictionary/types";
import "@/styles/pictionary-audience.css";

const CLOCK_SIZE = 200;
const CLOCK_STROKE = 10;
const CLOCK_RADIUS = (CLOCK_SIZE - CLOCK_STROKE) / 2;
const CLOCK_CIRCUMFERENCE = 2 * Math.PI * CLOCK_RADIUS;

function WordCurtain({ open }: Readonly<{ open: boolean }>) {
  return (
    <div className={`pict-curtain${open ? " pict-curtain-open" : ""}`} aria-hidden>
      <div className="pict-curtain-panel pict-curtain-left" />
      <div className="pict-curtain-panel pict-curtain-right" />
    </div>
  );
}

function HintBoard({
  word,
  hiddenIndexes,
}: Readonly<{ word: string; hiddenIndexes: number[] }>) {
  const hidden = new Set(hiddenIndexes);
  return (
    <div className="pict-hint" aria-label="Hint">
      {word.split("").map((char, index) => {
        if (char === " ") {
          return <span key={`gap-${index}-space`} className="pict-hint-gap" />;
        }
        const isHidden = hidden.has(index);
        return (
          <span
            key={`ch-${index}-${char}`}
            className="pict-hint-tile"
            style={{ animationDelay: `${index * 45}ms` }}
            data-hidden={isHidden ? "true" : "false"}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}

function GiantClock({
  remainingMs,
  durationMs,
}: Readonly<{ remainingMs: number; durationMs: number }>) {
  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, remainingMs / durationMs)) : 0;
  const offset = CLOCK_CIRCUMFERENCE * (1 - progress);
  const urgent = remainingMs > 0 && remainingMs <= 10_000;
  const expired = remainingMs <= 0;
  return (
    <div
      className={[
        "pict-clock-wrap",
        urgent ? "pict-clock-urgent" : "",
        expired ? "pict-clock-expired" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        className="pict-clock"
        viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
        role="img"
        aria-label={`Timer ${formatPictionaryClock(remainingMs)}`}
      >
        <defs>
          <linearGradient id="pict-clock-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffdc14" />
            <stop offset="55%" stopColor="#3dff8a" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <circle
          className="pict-clock-face"
          cx={CLOCK_SIZE / 2}
          cy={CLOCK_SIZE / 2}
          r={CLOCK_RADIUS - 8}
        />
        <circle
          className="pict-clock-track"
          cx={CLOCK_SIZE / 2}
          cy={CLOCK_SIZE / 2}
          r={CLOCK_RADIUS}
        />
        <circle
          className="pict-clock-progress"
          cx={CLOCK_SIZE / 2}
          cy={CLOCK_SIZE / 2}
          r={CLOCK_RADIUS}
          strokeDasharray={CLOCK_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="pict-clock-time" aria-hidden>
        {formatPictionaryClock(remainingMs)}
      </span>
    </div>
  );
}

export function PictionaryAudienceView({
  game,
}: Readonly<{ game: PictionaryState }>) {
  const [now, setNow] = useState<number | null>(null);
  const word = game.word.trim();
  const curtainOpen = Boolean(word) && game.reveal !== "covered";
  const showHint = game.reveal === "hint";

  useEffect(() => {
    setNow(Date.now());
    if (!game.timerRunning) return;
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [game.timerRunning, game.timerEndsAt]);

  const remainingMs =
    now == null ? game.timerRemainingMs : pictionaryRemainingMs(game, now);

  let curtainLabel = "Answer hidden behind curtain";
  if (!word) curtainLabel = "Waiting for a word";
  else if (curtainOpen) curtainLabel = showHint ? "Hint" : "Word to draw";

  let wordContent = (
    <p className="pict-word pict-word-empty">Waiting for a word</p>
  );
  if (word && showHint) {
    wordContent = (
      <HintBoard word={game.word} hiddenIndexes={game.hiddenIndexes} />
    );
  } else if (word) {
    wordContent = (
      <p className={`pict-word${curtainOpen ? " pict-word-reveal" : ""}`}>
        {game.word}
      </p>
    );
  }

  return (
    <div className="pict-stage" aria-label={curtainLabel}>
      <div className="pict-glow" aria-hidden />
      <div className="pict-sparkles" aria-hidden />
      <div className="pict-sparkles pict-sparkles-b" aria-hidden />
      <div className="pict-body">
        <div className="pict-curtain-stage" aria-label={curtainLabel}>
          {wordContent}
          {word ? <WordCurtain open={curtainOpen} /> : null}
        </div>
        <GiantClock remainingMs={remainingMs} durationMs={game.timerDurationMs} />
      </div>
    </div>
  );
}
