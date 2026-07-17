"use client";

import { useEffect, useRef, useState } from "react";
import type { FeudRound } from "@/lib/feud/types";
import { AnswerTile } from "./AnswerTile";
import "@/styles/feud-audience.css";

const LIGHTBULB_ROWS = 12;
const LIGHTBULB_COLS = 20;
const LIGHTBULBS = Array.from(
  { length: LIGHTBULB_ROWS * LIGHTBULB_COLS },
  (_, i) => ({
    id: `bulb-${i}`,
    index: i,
    row: Math.floor(i / LIGHTBULB_COLS),
    col: i % LIGHTBULB_COLS,
  }),
);

export function FeudAudienceView({
  round,
  showHeader,
  embedded = false,
  onToggleFullscreen,
}: Readonly<{
  round: FeudRound;
  showHeader: boolean;
  embedded?: boolean;
  onToggleFullscreen?: () => void;
}>) {
  const strikes = round.strikes || 0;
  const [strikePulse, setStrikePulse] = useState<number | null>(null);
  const prevStrikesRef = useRef(strikes);

  useEffect(() => {
    const prev = prevStrikesRef.current;
    prevStrikesRef.current = strikes;
    if (strikes <= prev) return;

    const frame = requestAnimationFrame(() => {
      setStrikePulse(strikes);
    });
    const t = setTimeout(() => {
      setStrikePulse(null);
    }, 3500);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t);
    };
  }, [strikes]);

  const total = round.answers.reduce(
    (sum, a) => (a.revealed ? sum + (a.points || 0) : sum),
    0,
  );

  const numCols = 2;
  const answers = round.answers;
  const numRows = Math.ceil(answers.length / numCols);
  const reordered: typeof answers = [];
  for (let row = 0; row < numRows; row++) {
    const leftIndex = row;
    if (leftIndex < answers.length) reordered.push(answers[leftIndex]);
    const rightIndex = row + numRows;
    if (rightIndex < answers.length) reordered.push(answers[rightIndex]);
  }

  return (
    <div className="feud-audience">
      <div className="lightbulb-grid">
        {LIGHTBULBS.map((bulb) => (
          <div
            key={bulb.id}
            className="lightbulb"
            style={
              {
                "--bulb-index": bulb.index,
                "--bulb-row": bulb.row,
                "--bulb-col": bulb.col,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {showHeader && (
        <div className="audience-header">
          <div className="question">{round.question || "—"}</div>
        </div>
      )}

      <div className="score">{total}</div>

      <div className="board-container">
        <div className="board">
          {reordered.map((a) => {
            const originalIndex = round.answers.findIndex((ans) => ans.id === a.id);
            return (
              <AnswerTile
                key={a.id}
                index={originalIndex}
                answer={a}
                revealed={!!a.revealed}
              />
            );
          })}
        </div>
      </div>

      {strikePulse != null && strikePulse > 0 && (
        <div key={strikePulse} className="bigx">
          <div
            className="bigx-inner"
            style={
              {
                "--strike-count": Math.max(1, strikePulse),
              } as React.CSSProperties
            }
          >
            {"X".repeat(Math.max(1, strikePulse))}
          </div>
        </div>
      )}

      {!embedded && onToggleFullscreen && (
        <div className="audience-actions">
          <button
            type="button"
            className="audience-btn"
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen"
            onClick={onToggleFullscreen}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm0-4h3V7H5v5h2V10zm10 7h-3v2h5v-5h-2v3zm2-12h-5v2h3v3h2V5z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
