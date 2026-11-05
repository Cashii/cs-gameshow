"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import LetterBoard from "./LetterBoard";
import type { WheelGameState } from "@/lib/wheel/types";
import "@/styles/wheel-audience.css";

const TOPIC_MIN_FONT_PX = 14;
const TOPIC_MAX_LINES = 2;

function topicFitsTwoLines(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const lineHeight = Number.parseFloat(style.lineHeight);
  const padY =
    Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return true;
  const maxHeight = padY + lineHeight * TOPIC_MAX_LINES + 1;
  return el.scrollHeight <= maxHeight;
}

function TopicBanner({
  topic,
  onSized,
}: Readonly<{
  topic: string;
  onSized: (el: HTMLParagraphElement | null) => void;
}>) {
  const ref = useRef<HTMLParagraphElement>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    el.style.fontSize = "";
    const maxPx = Number.parseFloat(getComputedStyle(el).fontSize);
    if (Number.isFinite(maxPx) && maxPx >= TOPIC_MIN_FONT_PX) {
      if (!topicFitsTwoLines(el)) {
        let lo = TOPIC_MIN_FONT_PX;
        let hi = maxPx;
        for (let i = 0; i < 18; i += 1) {
          const mid = (lo + hi) / 2;
          el.style.fontSize = `${mid}px`;
          if (topicFitsTwoLines(el)) lo = mid;
          else hi = mid;
        }
        el.style.fontSize = `${lo}px`;
      }
    }

    onSized(el);
  }, [onSized, topic]);

  useLayoutEffect(() => {
    fit();
    const frame = window.requestAnimationFrame(() => fit());
    const el = ref.current;
    if (!el) {
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      onSized(null);
    };
  }, [fit, onSized]);

  return (
    <p ref={ref} className="topic-banner">
      {topic}
    </p>
  );
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const SPARKLES = Array.from({ length: 300 }, (_, i) => ({
  id: i,
  left: seeded(i + 1) * 100,
  top: seeded(i + 101) * 100,
  delay: seeded(i + 201) * 6,
  duration: 2 + seeded(i + 301) * 5,
  size: 3 + seeded(i + 401) * 6,
}));

const LIGHT_BEAMS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  angle: seeded(i + 501) * 360,
  left: seeded(i + 601) * 100,
  top: seeded(i + 701) * 100,
  delay: seeded(i + 801) * 8,
  duration: 10 + seeded(i + 901) * 10,
}));

function isLetterSelected(wheel: WheelGameState, letter: string): boolean {
  if (wheel.revealedLetters.includes(letter)) return true;
  if (!wheel.revealedAll) return false;
  return wheel.phrase.toUpperCase().includes(letter);
}

const TOPIC_BOARD_GAP_PX = 12;

export function WheelAudienceView({
  wheel,
}: Readonly<{ wheel: WheelGameState }>) {
  const wrongCount = wheel.wrongCount ?? 0;
  const [wrongPulse, setWrongPulse] = useState<number | null>(null);
  const prevWrongRef = useRef(wrongCount);
  const stageRef = useRef<HTMLDivElement>(null);
  const topic = wheel.topic.trim();

  const syncTopicSpace = useCallback((banner: HTMLParagraphElement | null) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!banner) {
      stage.style.removeProperty("padding-top");
      return;
    }
    stage.style.paddingTop = `${banner.offsetTop + banner.offsetHeight + TOPIC_BOARD_GAP_PX}px`;
  }, []);

  useEffect(() => {
    const prev = prevWrongRef.current;
    prevWrongRef.current = wrongCount;
    if (wrongCount <= prev) return;

    const frame = requestAnimationFrame(() => {
      setWrongPulse(wrongCount);
    });
    const t = window.setTimeout(() => {
      setWrongPulse(null);
    }, 3500);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, [wrongCount]);

  useLayoutEffect(() => {
    if (topic) return;
    syncTopicSpace(null);
  }, [syncTopicSpace, topic]);

  return (
    <div className="wheel-audience">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
          radial-gradient(circle at 10% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 90% 70%, rgba(255, 255, 255, 0.12) 0%, transparent 45%),
          radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
        `,
        }}
      />
      <div
        className="texture-animated pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
          conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255, 255, 255, 0.05) 90deg, transparent 180deg),
          conic-gradient(from 180deg at 50% 50%, transparent 0%, rgba(255, 255, 255, 0.03) 90deg, transparent 180deg)
        `,
          backgroundSize: "200% 200%",
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {LIGHT_BEAMS.map((beam) => (
          <div
            key={beam.id}
            className="light-beam"
            style={{
              left: `${beam.left}%`,
              top: `${beam.top}%`,
              transform: `rotate(${beam.angle}deg)`,
              animationDelay: `${beam.delay}s`,
              animationDuration: `${beam.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sparkle-container">
          {SPARKLES.map((sparkle) => (
            <div
              key={sparkle.id}
              className="sparkle"
              style={{
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                animationDelay: `${sparkle.delay}s`,
                animationDuration: `${sparkle.duration}s`,
                width: `${sparkle.size}px`,
                height: `${sparkle.size}px`,
              }}
            />
          ))}
        </div>
      </div>

      <div
        ref={stageRef}
        className={`relative z-10 flex h-full w-full items-center justify-center p-4 sm:p-6 board-stage${
          wheel.showLetterLegend ? " has-letter-legend" : ""
        }`}
        style={{ overflow: "hidden" }}
      >
        {topic ? <TopicBanner topic={topic} onSized={syncTopicSpace} /> : null}
        <LetterBoard
          phrase={wheel.phrase}
          revealedLetters={wheel.revealedLetters}
          revealedAll={wheel.revealedAll}
          zoom={wheel.zoom || 1}
        />
      </div>

      <div
        className={`letter-legend${wheel.showLetterLegend ? " is-visible" : ""}`}
        aria-hidden={!wheel.showLetterLegend}
        aria-label="Selected letters"
      >
        {ALPHABET.map((letter) => {
          const selected = isLetterSelected(wheel, letter);
          return (
            <span
              key={letter}
              className={`letter-legend-item${selected ? " selected" : ""}`}
            >
              {letter}
            </span>
          );
        })}
      </div>

      {wrongPulse != null && wrongPulse > 0 && (
        <div key={wrongPulse} className="bigx">
          <div className="bigx-inner">X</div>
        </div>
      )}
    </div>
  );
}
