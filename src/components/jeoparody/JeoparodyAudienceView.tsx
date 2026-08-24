"use client";

import { useEffect, useRef, useState } from "react";
import type { JeoparodyContestant, JeoparodyGameState } from "@/lib/jeoparody/types";
import { findClue } from "@/lib/jeoparody/types";
import "@/styles/jeoparody-audience.css";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function ContestantScore({
  contestant,
}: Readonly<{ contestant: JeoparodyContestant }>) {
  const { display, bump } = useAnimatedScore(contestant.score);
  const negative = display < 0;
  return (
    <div className="jeoparody-contestant">
      <div className="jeoparody-contestant-name">
        {contestant.name || "Player"}
      </div>
      <div
        className={`jeoparody-contestant-score${bump ? " score-bump" : ""}${
          negative ? " negative" : ""
        }`}
      >
        {negative ? `-$${Math.abs(display)}` : `$${display}`}
      </div>
    </div>
  );
}

export function JeoparodyAudienceView({
  game,
  onToggleFullscreen,
}: {
  game: JeoparodyGameState;
  onToggleFullscreen?: () => void;
}) {
  const selected = findClue(game, game.selectedClueId);
  const showClue = game.phase !== "board" && selected;

  return (
    <div
      className="jeoparody-audience"
      onDoubleClick={onToggleFullscreen}
    >
      {showClue ? (
        <div className="jeoparody-clue-stage">
          <p className="jeoparody-clue-meta">
            {selected.category.name}
            <span>${selected.clue.value}</span>
          </p>
          <p className="jeoparody-clue-prompt">{selected.clue.prompt}</p>
          {game.phase === "answer" && (
            <p className="jeoparody-clue-response">{selected.clue.response}</p>
          )}
        </div>
      ) : (
        <div
          className="jeoparody-board"
          style={{
            gridTemplateColumns: `repeat(${Math.max(game.categories.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {game.categories.map((category) => (
            <div key={category.id} className="jeoparody-column">
              <div className="jeoparody-category">{category.name}</div>
              {category.clues.map((clue) => (
                <div
                  key={clue.id}
                  className={`jeoparody-cell${clue.played ? " played" : ""}`}
                >
                  {clue.played ? "" : `$${clue.value}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {game.showScores && (
        <div className="jeoparody-scores">
          {game.contestants.map((contestant) => (
            <ContestantScore key={contestant.id} contestant={contestant} />
          ))}
        </div>
      )}
    </div>
  );
}
