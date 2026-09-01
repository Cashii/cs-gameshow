"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_QUESTION_TIME_TITLE,
  formatQuestionTimeClock,
  questionTimeRemainingMs,
  type QuestionTimeState,
  type QuestionTimeTeam,
} from "@/lib/question-time/types";
import "@/styles/question-time-audience.css";

const CLOCK_SIZE = 200;
const CLOCK_STROKE = 10;
const CLOCK_RADIUS = (CLOCK_SIZE - CLOCK_STROKE) / 2;
const CLOCK_CIRCUMFERENCE = 2 * Math.PI * CLOCK_RADIUS;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useAnimatedScore(value: number, duration = 700) {
  const [display, setDisplay] = useState(value);
  const [bump, setBump] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;

    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    setBump(true);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const bumpTimer = window.setTimeout(() => setBump(false), 560);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(bumpTimer);
    };
  }, [value, duration]);

  return { display, bump };
}

function TeamScore({
  team,
  side,
  fallback,
}: Readonly<{
  team: QuestionTimeTeam;
  side: "left" | "right";
  fallback: string;
}>) {
  const { display, bump } = useAnimatedScore(team.score);
  return (
    <div className={`qt-team qt-team-${side}`}>
      <div className="qt-team-name">{team.name.trim() || fallback}</div>
      <div className={`qt-team-score${bump ? " score-bump" : ""}`}>{display}</div>
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
        "qt-clock-wrap",
        urgent ? "qt-clock-urgent" : "",
        expired ? "qt-clock-expired" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="qt-clock-halo" aria-hidden />
      <span className="qt-clock-halo-b" aria-hidden />
      <svg
        className="qt-clock"
        viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
        role="img"
        aria-label={`Timer ${formatQuestionTimeClock(remainingMs)}`}
      >
        <defs>
          <linearGradient id="qt-clock-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="55%" stopColor="#ff8fb3" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <circle
          className="qt-clock-face"
          cx={CLOCK_SIZE / 2}
          cy={CLOCK_SIZE / 2}
          r={CLOCK_RADIUS - 8}
        />
        <circle
          className="qt-clock-track"
          cx={CLOCK_SIZE / 2}
          cy={CLOCK_SIZE / 2}
          r={CLOCK_RADIUS}
        />
        <circle
          className="qt-clock-progress"
          cx={CLOCK_SIZE / 2}
          cy={CLOCK_SIZE / 2}
          r={CLOCK_RADIUS}
          strokeDasharray={CLOCK_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="qt-clock-time" aria-hidden>
        {formatQuestionTimeClock(remainingMs)}
      </span>
    </div>
  );
}

export function QuestionTimeAudienceView({
  game,
}: Readonly<{ game: QuestionTimeState }>) {
  const [now, setNow] = useState<number | null>(null);
  const question = game.question.trim();

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
    now == null ? game.timerRemainingMs : questionTimeRemainingMs(game, now);
  const title = game.title.trim() || DEFAULT_QUESTION_TIME_TITLE;

  return (
    <div className="qt-stage">
      <div className="qt-sky" aria-hidden />
      <div className="qt-aurora qt-aurora-left" aria-hidden />
      <div className="qt-aurora qt-aurora-right" aria-hidden />
      <span className="qt-bokeh qt-bokeh-a" aria-hidden />
      <span className="qt-bokeh qt-bokeh-b" aria-hidden />
      <span className="qt-bokeh qt-bokeh-c" aria-hidden />
      <span className="qt-bokeh qt-bokeh-d" aria-hidden />

      <h1 className="qt-title">{title}</h1>

      <div className="qt-body">
        <div className="qt-question">
          {question ? (
            <p>{game.question}</p>
          ) : (
            <p className="qt-question-empty">Waiting for a question</p>
          )}
        </div>

        <div className="qt-bottom">
          <TeamScore team={game.leftTeam} side="left" fallback="Team 1" />
          <GiantClock remainingMs={remainingMs} durationMs={game.timerDurationMs} />
          <TeamScore team={game.rightTeam} side="right" fallback="Team 2" />
        </div>
      </div>
    </div>
  );
}
