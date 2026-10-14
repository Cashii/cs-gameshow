"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  clampDerbyRacerScale,
  createDefaultDerbyState,
  DERBY_RACER_IDS,
  getDerbyRacer,
  getDerbyRacers,
  getDerbyRacerNameOverrides,
  getDerbyTheme,
  type DerbyGameState,
  type DerbyRacerId,
} from "@/lib/derby/types";
import { createRaceSampler } from "@/lib/derby/race";
import { subscribeDerbyClock } from "@/lib/derby/clock";
import { DerbyHorse } from "@/components/derby/DerbyHorse";
import { DerbyToy } from "@/components/derby/DerbyToy";
import { DerbyDiscoBall } from "@/components/derby/DerbyWonderbarBrand";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import "@/styles/derby-audience.css";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function rootFontPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function laneTravelPx(horse: HTMLElement): number {
  const lane = horse.parentElement;
  if (!lane) return 0;
  return Math.max(0, lane.clientWidth - horse.offsetWidth - 4 * rootFontPx());
}

export function DerbyAudienceView({
  game: gameProp,
}: Readonly<{ game: DerbyGameState }>) {
  const game = gameProp ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);
  const nameOverrides = getDerbyRacerNameOverrides(game, theme);
  const racers = getDerbyRacers(theme, nameOverrides);
  const horseRefs = useRef<
    Partial<Record<DerbyRacerId, HTMLDivElement | null>>
  >({});
  const [motionT, setMotionT] = useState(0);
  const [travels, setTravels] = useState<Partial<Record<DerbyRacerId, number>>>(
    {},
  );

  const sampler = useMemo(() => {
    if (!game.winnerId) return null;
    return createRaceSampler(game.winnerId, game.seed);
  }, [game.winnerId, game.seed, game.sequence]);

  useLayoutEffect(() => {
    const measure = () => {
      const next: Partial<Record<DerbyRacerId, number>> = {};
      for (const id of DERBY_RACER_IDS) {
        const el = horseRefs.current[id];
        if (!el) continue;
        next[id] = laneTravelPx(el);
      }
      setTravels((prev) => {
        const ids = new Set([...Object.keys(prev), ...Object.keys(next)]);
        for (const id of ids) {
          const key = id as DerbyRacerId;
          if (Math.abs((prev[key] ?? -1) - (next[key] ?? -1)) > 0.5) return next;
        }
        return prev;
      });
    };

    measure();
    const lane = horseRefs.current[DERBY_RACER_IDS[0]]?.parentElement ?? null;
    const ro =
      lane && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (lane && ro) ro.observe(lane);
    return () => ro?.disconnect();
  }, [game.phase, game.racerScale, theme]);

  useLayoutEffect(() => {
    let alive = true;
    let raf = 0;
    let interval = 0;
    let worker: Worker | null = null;
    let workerUrl: string | null = null;
    let lastApplied = 0;

    const duration = game.durationMs > 0 ? game.durationMs : 20_000;
    const startedAt = game.startedAt;

    const applyClock = () => {
      if (!alive || startedAt == null) return;
      const now = Date.now();
      const t = Math.min(1, Math.max(0, (now - startedAt) / duration));
      if (now - lastApplied < 16 && t < 1) return;
      lastApplied = now;
      setMotionT((prev) => (Math.abs(prev - t) < 0.0001 ? prev : t));
    };

    if (game.phase === "idle" || !game.winnerId || !sampler) {
      setMotionT(0);
      return () => {
        alive = false;
      };
    }

    if (prefersReducedMotion() || game.phase === "finished") {
      setMotionT(1);
      return () => {
        alive = false;
      };
    }

    if (game.phase !== "racing" || startedAt == null) {
      return () => {
        alive = false;
      };
    }

    applyClock();

    const frame = () => {
      applyClock();
      if (!alive || Date.now() - startedAt >= duration) return;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    interval = window.setInterval(applyClock, 32);

    const unsubscribe = subscribeDerbyClock((tick) => {
      if (!alive || tick.startedAt !== startedAt) return;
      applyClock();
    });

    try {
      workerUrl = URL.createObjectURL(
        new Blob(["setInterval(function(){postMessage(0)},32)"], {
          type: "text/javascript",
        }),
      );
      worker = new Worker(workerUrl);
      worker.onmessage = () => applyClock();
    } catch {
      worker = null;
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      unsubscribe();
      worker?.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
    };
  }, [
    game.phase,
    game.startedAt,
    game.durationMs,
    game.winnerId,
    game.sequence,
    sampler,
  ]);

  const showWinner =
    game.phase !== "idle" &&
    game.winnerId != null &&
    (game.phase === "finished" || motionT >= 1);
  const frame =
    sampler && game.phase !== "idle" ? sampler(showWinner ? 1 : motionT) : null;

  const winner =
    showWinner && game.winnerId
      ? getDerbyRacer(game.winnerId, theme, nameOverrides)
      : null;
  const racing = game.phase === "racing" && !showWinner;
  const winningVotes =
    winner != null ? (game.voteTallies?.[winner.id] ?? 0) : 0;

  return (
    <div
      className={`derby-audience theme-${theme}${racing ? " is-racing" : ""}${winner ? " is-finished" : ""}`}
      style={
        {
          "--derby-racer-scale": String(clampDerbyRacerScale(game.racerScale)),
        } as CSSProperties
      }
    >
      {theme === "wonderbar" && (
        <>
          <div className="derby-disco-ceiling" aria-hidden />
          <div className="derby-disco-column" aria-hidden />
          <div className="derby-disco-ball-wrap" aria-hidden>
            <DerbyDiscoBall />
          </div>
        </>
      )}

      <header className="derby-chrome">
        <h1 className="derby-title">
          {theme === "wonderbar" ? "Dildo Derby" : "Kentucky Derby"}
        </h1>
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
          {racers.map((racer) => (
            <div key={racer.id} className="derby-lane">
              <span className="derby-lane-label">{racer.name}</span>
              <div className="derby-lane-slot" aria-hidden />
              <div
                ref={(el) => {
                  horseRefs.current[racer.id] = el;
                }}
                className={`derby-horse derby-racer-${racer.id}${winner?.id === racer.id ? " is-winner" : ""}`}
                style={
                  frame
                    ? {
                        transform: `translate3d(${((frame.positions[racer.id] ?? 0) * (travels[racer.id] ?? 0)).toFixed(2)}px, 0, 0)`,
                      }
                    : undefined
                }
              >
                <div className="derby-horse-body">
                  {theme === "wonderbar" ? (
                    <DerbyToy racer={racer} isWinner={winner?.id === racer.id} />
                  ) : (
                    <DerbyHorse racer={racer} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {winner && (
        <output className="derby-winner-banner" aria-live="polite">
          <span className="derby-winner-banner-title">{winner.name} wins</span>
          <span className="derby-winner-banner-votes">
            {winningVotes} {winningVotes === 1 ? "vote" : "votes"}
          </span>
        </output>
      )}

      {game.phase === "idle" && game.raceId ? (
        <div
          className={`derby-join-qr-overlay absolute inset-x-0 bottom-0 top-[calc(var(--derby-chrome-h)-5rem)] z-20 flex items-center justify-center ${
            game.showJoinQr ? "is-visible" : "is-hidden"
          }`}
          aria-hidden={!game.showJoinQr}
        >
          <div
            className="derby-join-qr-backdrop pointer-events-none absolute inset-0 backdrop-blur-sm"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.35) 32%, rgba(10,10,10,0.55) 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 28%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 28%)",
            }}
            aria-hidden
          />
          <div className="derby-join-qr-card relative flex flex-col items-center gap-4 rounded-3xl bg-neutral-950/20 px-6 py-5">
            <div className="size-[min(32rem,62vmin)]">
              <PlayerVoteQr label="Scan to play" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
