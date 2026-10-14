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

const TRACK_STEPS = 60;

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
  const [showWinner, setShowWinner] = useState(false);
  const [layoutEpoch, setLayoutEpoch] = useState(0);

  const sampler = useMemo(() => {
    if (!game.winnerId) return null;
    return createRaceSampler(game.winnerId, game.seed);
  }, [game.winnerId, game.seed, game.sequence]);

  useLayoutEffect(() => {
    let alive = true;
    const anims: Animation[] = [];

    const eachHorse = (fn: (el: HTMLDivElement, id: DerbyRacerId) => void) => {
      for (const id of DERBY_RACER_IDS) {
        const el = horseRefs.current[id];
        if (el) fn(el, id);
      }
    };

    const placeAt = (t: number) => {
      const frame = sampler ? sampler(Math.min(1, Math.max(0, t))) : null;
      eachHorse((el, id) => {
        const travel = laneTravelPx(el);
        const progress = frame ? frame.positions[id] : 0;
        el.style.transform = `translate3d(${(progress * travel).toFixed(2)}px, 0, 0)`;
      });
    };

    const clearShift = () => {
      eachHorse((el) => {
        el.style.transform = "";
      });
    };

    const cancelAnims = () => {
      for (const anim of anims) {
        anim.onfinish = null;
        anim.cancel();
      }
      anims.length = 0;
    };

    const reduced = prefersReducedMotion();
    const duration = game.durationMs > 0 ? game.durationMs : 20_000;
    const startedAt = game.startedAt;
    const elapsed =
      startedAt == null ? 0 : Math.max(0, Date.now() - startedAt);

    if (game.phase === "idle" || !game.winnerId || !sampler) {
      clearShift();
      setShowWinner(false);
      return () => {
        alive = false;
        cancelAnims();
      };
    }

    if (reduced || game.phase === "finished" || elapsed >= duration) {
      placeAt(1);
      setShowWinner(true);
      return () => {
        alive = false;
      };
    }

    if (game.phase !== "racing" || startedAt == null) {
      return () => {
        alive = false;
      };
    }

    setShowWinner(false);

    const sampleHorse = horseRefs.current[DERBY_RACER_IDS[0]];
    const travelNow = sampleHorse ? laneTravelPx(sampleHorse) : 0;
    const lane = sampleHorse?.parentElement ?? null;
    const ro =
      lane && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            const el = horseRefs.current[DERBY_RACER_IDS[0]];
            if (!el) return;
            const next = laneTravelPx(el);
            if (next > 2 && Math.abs(next - travelNow) > 2) {
              setLayoutEpoch((n) => n + 1);
            }
          })
        : null;
    if (lane && ro) ro.observe(lane);

    if (travelNow <= 0) {
      return () => {
        alive = false;
        ro?.disconnect();
      };
    }

    const timelineNow = document.timeline.currentTime;
    const startTime =
      typeof timelineNow === "number" ? timelineNow - elapsed : null;

    eachHorse((el, id) => {
      const travel = laneTravelPx(el);
      const frames: Keyframe[] = [];
      for (let i = 0; i <= TRACK_STEPS; i += 1) {
        const t = i / TRACK_STEPS;
        const x = sampler(t).positions[id] * travel;
        frames.push({
          transform: `translate3d(${x.toFixed(2)}px, 0, 0)`,
          offset: t,
        });
      }
      const anim = el.animate(frames, {
        duration,
        easing: "linear",
        fill: "both",
      });
      try {
        if (startTime != null) anim.startTime = startTime;
        else anim.currentTime = Math.min(elapsed, duration);
      } catch {
        anim.currentTime = Math.min(elapsed, duration);
      }
      anim.onfinish = () => {
        if (alive) setShowWinner(true);
      };
      anims.push(anim);
    });

    const timer = window.setInterval(() => {
      if (!alive) return;
      const elapsedNow = Math.max(0, Date.now() - startedAt);
      for (const anim of anims) {
        if (anim.playState === "finished") continue;
        const current =
          typeof anim.currentTime === "number" ? anim.currentTime : 0;
        if (
          document.visibilityState === "visible" &&
          anim.playState === "paused"
        ) {
          anim.play();
        }
        if (elapsedNow - current > 400) {
          anim.currentTime = Math.min(elapsedNow, duration);
        }
      }
    }, 200);

    return () => {
      alive = false;
      window.clearInterval(timer);
      ro?.disconnect();
      cancelAnims();
    };
  }, [
    game.phase,
    game.startedAt,
    game.durationMs,
    game.winnerId,
    game.sequence,
    game.racerScale,
    sampler,
    layoutEpoch,
  ]);

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
