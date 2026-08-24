"use client";

import LetterBoard from "./LetterBoard";
import type { WheelGameState } from "@/lib/wheel/types";
import "@/styles/wheel-audience.css";

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

export function WheelAudienceView({
  wheel,
}: Readonly<{ wheel: WheelGameState }>) {
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
        className={`relative z-10 flex h-full w-full items-center justify-center p-4 sm:p-6 board-stage${
          wheel.showLetterLegend ? " has-letter-legend" : ""
        }${wheel.topic.trim() ? " has-topic" : ""}`}
        style={{ overflow: "hidden" }}
      >
        {wheel.topic.trim() ? (
          <p className="topic-banner">{wheel.topic.trim()}</p>
        ) : null}
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
    </div>
  );
}
