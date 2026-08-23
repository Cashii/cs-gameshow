"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  createDefaultDerbyState,
  DERBY_RACERS,
  getDerbyRacer,
  type DerbyGameState,
  type DerbyRacerId,
} from "@/lib/derby/types";
import { createRaceSampler, raceProgress } from "@/lib/derby/race";
import "@/styles/derby-audience.css";

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function DerbyAudienceView({
  game: gameProp,
}: Readonly<{ game: DerbyGameState }>) {
  const game = gameProp ?? createDefaultDerbyState();
  const carRefs = useRef<Partial<Record<DerbyRacerId, HTMLDivElement | null>>>(
    {},
  );
  const clockRef = useRef<HTMLDivElement | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  const sampler = useMemo(() => {
    if (!game.winnerId) return null;
    return createRaceSampler(game.winnerId, game.seed);
  }, [game.winnerId, game.seed, game.sequence]);

  useEffect(() => {
    const apply = (t: number) => {
      const positions = sampler
        ? sampler(t)
        : { red: 0, blue: 0, green: 0, yellow: 0 };
      for (const racer of DERBY_RACERS) {
        const el = carRefs.current[racer.id];
        if (el) {
          el.style.setProperty(
            "--derby-progress",
            String(positions[racer.id]),
          );
        }
      }
      if (clockRef.current) {
        if (game.phase === "idle") {
          clockRef.current.textContent = formatClock(game.durationMs);
        } else {
          const remaining = Math.max(0, (1 - t) * game.durationMs);
          clockRef.current.textContent = formatClock(remaining);
        }
      }
    };

    const reduced = prefersReducedMotion();
    const jumpToFinish =
      reduced && (game.phase === "racing" || game.phase === "finished");

    if (game.phase === "idle" || !game.winnerId) {
      apply(0);
      setShowWinner(false);
      return;
    }

    if (game.phase === "finished" || jumpToFinish) {
      apply(1);
      setShowWinner(true);
      return;
    }

    setShowWinner(false);
    let raf = 0;
    const loop = () => {
      const t = raceProgress(game.startedAt, game.durationMs, Date.now());
      apply(t);
      if (t >= 1) {
        setShowWinner(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    game.phase,
    game.startedAt,
    game.durationMs,
    game.winnerId,
    game.sequence,
    sampler,
  ]);

  const winner =
    showWinner && game.winnerId ? getDerbyRacer(game.winnerId) : null;

  return (
    <div
      className={`derby-audience${game.phase === "racing" && !showWinner ? " is-racing" : ""}`}
    >
      <header className="derby-chrome">
        <h1 className="derby-title">Derby</h1>
        <div ref={clockRef} className="derby-clock" aria-live="off">
          {formatClock(game.durationMs)}
        </div>
      </header>

      <div className="derby-track-wrap">
        <div className="derby-track">
          <div className="derby-start" aria-hidden />
          <div className="derby-finish" aria-hidden />
          {DERBY_RACERS.map((racer) => (
            <div key={racer.id} className="derby-lane">
              <span className="derby-lane-label">{racer.name}</span>
              <div
                ref={(el) => {
                  carRefs.current[racer.id] = el;
                }}
                className="derby-car"
                style={
                  {
                    "--derby-color": racer.hex,
                    "--derby-color-dark": racer.hexDark,
                  } as CSSProperties
                }
              >
                <div className="derby-car-body" />
                <div className="derby-car-cabin" />
                <div className="derby-car-spoiler" />
                <span className="derby-car-num">{racer.number}</span>
                <div className="derby-wheel derby-wheel--front" />
                <div className="derby-wheel derby-wheel--rear" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {winner && (
        <div className="derby-winner-banner" role="status">
          {winner.name} wins
        </div>
      )}
    </div>
  );
}
