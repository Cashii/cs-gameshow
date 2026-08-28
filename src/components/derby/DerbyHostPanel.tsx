"use client";

import { useEffect, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  clampDerbyRacerScale,
  createDefaultDerbyState,
  DEFAULT_DERBY_RACER_SCALE,
  DERBY_DURATION_MS,
  DERBY_THEME_OPTIONS,
  getDerbyRacer,
  getDerbyRacers,
  getDerbyTheme,
  isDerbyTheme,
  MAX_DERBY_RACER_SCALE,
  MIN_DERBY_RACER_SCALE,
  type DerbyRacerId,
  type DerbyTheme,
} from "@/lib/derby/types";
import { Select } from "@/components/ui/Select";
import { OperatorNotice } from "@/components/operator/OperatorNotice";

function newRaceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `derby-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DerbyHostPanel() {
  const { state, updateDerby } = useSuite();
  const game = state.derby ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);
  const racers = getDerbyRacers(theme);
  const [now, setNow] = useState(() => Date.now());
  const racing = game.phase === "racing";
  const spectatorShowingDerby = state.spectatorGame === "derby";

  useEffect(() => {
    if (game.phase !== "racing" || game.startedAt == null) return;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t - (game.startedAt ?? 0) >= game.durationMs) {
        updateDerby((prev) =>
          prev.phase === "racing" ? { ...prev, phase: "finished" } : prev,
        );
      }
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [game.phase, game.startedAt, game.durationMs, game.sequence, updateDerby]);

  const pickWinner = (id: DerbyRacerId) => {
    if (racing) return;
    updateDerby((prev) => ({ ...prev, winnerId: id }));
  };

  const setTheme = (next: DerbyTheme) => {
    updateDerby((prev) => ({ ...prev, theme: next }));
  };

  const startRace = () => {
    if (!game.winnerId || racing) return;
    updateDerby((prev) => ({
      ...prev,
      phase: "racing",
      raceId: newRaceId(),
      startedAt: Date.now(),
      durationMs: DERBY_DURATION_MS,
      seed: Math.floor(Math.random() * 0x7fffffff),
      sequence: prev.sequence + 1,
    }));
  };

  const reset = () => {
    updateDerby((prev) => ({
      ...createDefaultDerbyState(),
      theme: getDerbyTheme(prev),
      racerScale: clampDerbyRacerScale(prev.racerScale),
      sequence: prev.sequence,
    }));
  };

  const remaining =
    racing && game.startedAt != null
      ? Math.max(0, game.durationMs - (now - game.startedAt))
      : game.durationMs;

  const picked = game.winnerId ? getDerbyRacer(game.winnerId, theme) : null;
  const racerNoun = theme === "wonderbar" ? "Toy" : "Horse";
  const title =
    theme === "wonderbar" ? "Wonderbar's Dildo Derby" : "Derby Race";

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex w-full flex-col gap-6 px-6 py-6">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Pick the winner, then start a 20-second race on the spectator
            screen. The audience should not see the pick until the finish.
          </p>
        </div>

        {!spectatorShowingDerby && (
          <OperatorNotice>
            Spectator is not on Derby Race. Use the Spectator screen dropdown so
            the projector shows the race.
          </OperatorNotice>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Theme
          </p>
          <Select
            aria-label="Derby theme"
            value={theme}
            onValueChange={(value) => {
              if (isDerbyTheme(value)) setTheme(value);
            }}
            options={DERBY_THEME_OPTIONS}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {theme === "wonderbar" ? "Toy size" : "Horse size"}
            </p>
            <span className="text-sm font-semibold tabular-nums text-white">
              {Math.round(clampDerbyRacerScale(game.racerScale) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={MIN_DERBY_RACER_SCALE}
            max={MAX_DERBY_RACER_SCALE}
            step={0.05}
            value={clampDerbyRacerScale(game.racerScale)}
            aria-label={theme === "wonderbar" ? "Toy size" : "Horse size"}
            onChange={(e) =>
              updateDerby((prev) => ({
                ...prev,
                racerScale: clampDerbyRacerScale(
                  Number.parseFloat(e.target.value),
                ),
              }))
            }
            className="w-full accent-sky-500"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>{Math.round(MIN_DERBY_RACER_SCALE * 100)}%</span>
            <button
              type="button"
              onClick={() =>
                updateDerby((prev) => ({
                  ...prev,
                  racerScale: DEFAULT_DERBY_RACER_SCALE,
                }))
              }
              className="font-medium text-sky-400 hover:text-sky-300"
            >
              Reset to default
            </button>
            <span>{Math.round(MAX_DERBY_RACER_SCALE * 100)}%</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Winner (operator only)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {racers.map((racer) => {
              const selected = game.winnerId === racer.id;
              return (
                <button
                  key={racer.id}
                  type="button"
                  disabled={racing}
                  onClick={() => pickWinner(racer.id)}
                  className={`rounded-xl border px-3 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? "border-white bg-neutral-800 ring-2 ring-white/80"
                      : "border-neutral-700 bg-neutral-900 hover:border-neutral-500"
                  }`}
                >
                  <span
                    className="mx-auto mb-2 block h-8 w-8 rounded-full border border-black/30 shadow-inner"
                    style={{ background: racer.hex }}
                    aria-hidden
                  />
                  <span className="block text-sm font-bold text-white">
                    {racer.name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {racerNoun} {racer.number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-4">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Status
          </p>
          {game.phase === "idle" && (
            <p className="mt-1 text-lg font-semibold text-white">
              {picked ? `Ready — ${picked.name} wins` : "Pick a winner"}
            </p>
          )}
          {game.phase === "racing" && (
            <p className="mt-1 text-lg font-semibold text-white">
              Racing — {formatClock(remaining)} left
              {picked ? ` · ${picked.name} (hidden)` : ""}
            </p>
          )}
          {game.phase === "finished" && (
            <p className="mt-1 text-lg font-semibold text-white">
              Finished
              {picked ? ` — ${picked.name} wins` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!game.winnerId || racing}
            onClick={startRace}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            {game.phase === "finished" ? "Race again" : "Start race"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-teal-500 bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
