"use client";

import { useEffect, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  createDefaultDerbyState,
  DERBY_DURATION_MS,
  DERBY_RACERS,
  getDerbyRacer,
  type DerbyRacerId,
} from "@/lib/derby/types";

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
      sequence: prev.sequence,
    }));
  };

  const remaining =
    racing && game.startedAt != null
      ? Math.max(0, game.durationMs - (Date.now() - game.startedAt))
      : game.durationMs;

  const picked = game.winnerId ? getDerbyRacer(game.winnerId) : null;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6">
        <div>
          <h2 className="text-lg font-bold text-white">Derby</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Pick the winner, then start a 20-second race on the spectator
            screen. The audience should not see the pick until the finish.
          </p>
        </div>

        {!spectatorShowingDerby && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Spectator is not on Derby. Use the Spectator screen dropdown so
            the projector shows the race.
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Winner (operator only)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DERBY_RACERS.map((racer) => {
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
                    Car {racer.number}
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
            className="rounded-lg border border-neutral-600 px-5 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
