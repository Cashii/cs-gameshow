"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultDerbyState,
  DERBY_RACERS,
  getDerbyRacer,
  type DerbyGameState,
  type DerbyRacerId,
} from "@/lib/derby/types";
import { createRaceSampler, raceProgress } from "@/lib/derby/race";
import { DerbyCar } from "@/components/derby/DerbyCar";
import "@/styles/derby-audience.css";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const IDLE_FRAME = {
  positions: { red: 0, blue: 0, green: 0, yellow: 0 },
  speeds: { red: 0, blue: 0, green: 0, yellow: 0 },
};

export function DerbyAudienceView({
  game: gameProp,
}: Readonly<{ game: DerbyGameState }>) {
  const game = gameProp ?? createDefaultDerbyState();
  const carRefs = useRef<Partial<Record<DerbyRacerId, HTMLDivElement | null>>>(
    {},
  );
  const [showWinner, setShowWinner] = useState(false);

  const sampler = useMemo(() => {
    if (!game.winnerId) return null;
    return createRaceSampler(game.winnerId, game.seed);
  }, [game.winnerId, game.seed, game.sequence]);

  useEffect(() => {
    const apply = (t: number, hopping: boolean) => {
      const frame = sampler ? sampler(t) : IDLE_FRAME;
      for (const racer of DERBY_RACERS) {
        const el = carRefs.current[racer.id];
        if (!el) continue;
        el.style.setProperty(
          "--derby-progress",
          String(frame.positions[racer.id]),
        );
        const hops = 18;
        const hop = hopping
          ? Math.max(0, Math.sin(frame.positions[racer.id] * hops * Math.PI))
          : 0;
        el.style.setProperty("--derby-hop", hop.toFixed(3));
      }
    };

    const reduced = prefersReducedMotion();
    const jumpToFinish =
      reduced && (game.phase === "racing" || game.phase === "finished");

    if (game.phase === "idle" || !game.winnerId) {
      apply(0, false);
      setShowWinner(false);
      return;
    }

    if (game.phase === "finished" || jumpToFinish) {
      apply(1, false);
      setShowWinner(true);
      return;
    }

    setShowWinner(false);
    let raf = 0;
    const loop = () => {
      const t = raceProgress(game.startedAt, game.durationMs, Date.now());
      apply(t, t < 1 && !reduced);
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
  const racing = game.phase === "racing" && !showWinner;

  return (
    <div
      className={`derby-audience${racing ? " is-racing" : ""}${winner ? " is-finished" : ""}`}
    >
      <header className="derby-chrome">
        <h1 className="derby-title">Derby</h1>
      </header>

      <div className="derby-track-wrap">
        <div className="derby-track">
          <div className="derby-track-lights" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="derby-bulb" />
            ))}
          </div>
          <div className="derby-start" aria-hidden />
          <div className="derby-finish" aria-hidden />
          {DERBY_RACERS.map((racer) => (
            <div key={racer.id} className="derby-lane">
              <span className="derby-lane-label">{racer.name}</span>
              <div className="derby-lane-slot" aria-hidden />
              <div
                ref={(el) => {
                  carRefs.current[racer.id] = el;
                }}
                className="derby-car"
              >
                <DerbyCar racer={racer} />
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
