"use client";

import { useEffect, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  clampDerbyRacerScale,
  createDefaultDerbyState,
  DERBY_DURATION_MS,
  DERBY_THEME_OPTIONS,
  getDerbyRacer,
  getDerbyRacers,
  getDerbyRacerNameOverrides,
  getDerbyTheme,
  isDerbyTheme,
  MAX_DERBY_RACER_SCALE,
  MIN_DERBY_RACER_SCALE,
  type DerbyRacerId,
  type DerbyTheme,
  WONDERBAR_RACERS,
  DERBY_RACERS,
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
  const nameOverrides = getDerbyRacerNameOverrides(game, theme);
  const racers = getDerbyRacers(theme, nameOverrides);
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
      racerNames: prev.racerNames ?? {},
      sequence: prev.sequence,
    }));
  };

  const setRacerName = (id: DerbyRacerId, name: string) => {
    updateDerby((prev) => {
      const currentTheme = getDerbyTheme(prev);
      const prevThemeNames = {
        ...(prev.racerNames?.[currentTheme] ?? {}),
        [id]: name,
      };
      return {
        ...prev,
        racerNames: {
          ...(prev.racerNames ?? {}),
          [currentTheme]: prevThemeNames,
        },
      };
    });
  };

  const remaining =
    racing && game.startedAt != null
      ? Math.max(0, game.durationMs - (now - game.startedAt))
      : game.durationMs;

  const picked = game.winnerId
    ? getDerbyRacer(game.winnerId, theme, nameOverrides)
    : null;
  const racerNoun = theme === "wonderbar" ? "Toy" : "Horse";
  const sizeLabel = theme === "wonderbar" ? "Toy size" : "Horse size";
  const racerScale = clampDerbyRacerScale(game.racerScale);

  let statusText = "Pick a winner";
  if (game.phase === "idle" && picked) {
    statusText = `Ready — ${picked.name} wins`;
  } else if (game.phase === "racing") {
    statusText = picked
      ? `Racing — ${picked.name} (hidden from audience)`
      : "Racing";
  } else if (game.phase === "finished") {
    statusText = picked ? `Finished — ${picked.name} wins` : "Finished";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Status
            </p>
            <p className="truncate text-sm font-semibold text-white">
              {statusText}
            </p>
          </div>
          {racing ? (
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Time left
              </p>
              <p
                className={`text-3xl font-bold tabular-nums ${
                  remaining <= 5_000 ? "text-amber-300" : "text-white"
                }`}
                aria-live="polite"
              >
                {formatClock(remaining)}
              </p>
            </div>
          ) : null}
          <div className="flex min-w-48 max-w-72 flex-1 items-center gap-2">
            <span className="shrink-0 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Size
            </span>
            <input
              type="range"
              min={MIN_DERBY_RACER_SCALE}
              max={MAX_DERBY_RACER_SCALE}
              step={0.05}
              value={racerScale}
              aria-label={sizeLabel}
              onChange={(e) =>
                updateDerby((prev) => ({
                  ...prev,
                  racerScale: clampDerbyRacerScale(
                    Number.parseFloat(e.target.value),
                  ),
                }))
              }
              className="min-w-0 flex-1 accent-sky-500"
            />
            <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-white">
              {Math.round(racerScale * 100)}%
            </span>
          </div>
          <div className="ml-auto w-64 shrink-0">
            <Select
              compact
              aria-label="Derby theme"
              value={theme}
              onValueChange={(value) => {
                if (isDerbyTheme(value)) setTheme(value);
              }}
              options={DERBY_THEME_OPTIONS}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          {!spectatorShowingDerby && (
            <OperatorNotice>
              Spectator is not on Derby Race. Use the Spectator screen dropdown so
              the projector shows the race.
            </OperatorNotice>
          )}

          <p className="text-sm text-neutral-400">
            Pick the winner, then start a 20-second race on the spectator
            screen. The audience should not see the pick until the finish.
          </p>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Winner (operator only)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {racers.map((racer) => {
              const selected = game.winnerId === racer.id;
              const defaultName =
                (theme === "wonderbar" ? WONDERBAR_RACERS : DERBY_RACERS).find(
                  (item) => item.id === racer.id,
                )?.name ?? racer.name;
              return (
                <div
                  key={racer.id}
                  className={`rounded-xl border px-3 py-4 text-center transition-colors ${
                    selected
                      ? "border-white bg-neutral-800 ring-2 ring-white/80"
                      : "border-neutral-700 bg-neutral-900"
                  }`}
                >
                  <button
                    type="button"
                    disabled={racing}
                    onClick={() => pickWinner(racer.id)}
                    className="w-full disabled:cursor-not-allowed disabled:opacity-60"
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
                  <label className="mt-3 block text-left">
                    <span className="sr-only">
                      {racerNoun} {racer.number} name
                    </span>
                    <input
                      type="text"
                      value={nameOverrides[racer.id] ?? defaultName}
                      disabled={racing}
                      onChange={(event) =>
                        setRacerName(racer.id, event.target.value)
                      }
                      placeholder={defaultName}
                      className="mt-1 h-9 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 text-center text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none disabled:opacity-60"
                    />
                  </label>
                </div>
              );
            })}
          </div>
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
    </div>
  );
}
