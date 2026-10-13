"use client";

import { useEffect, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  clampDerbyRacerScale,
  emptyDerbyVoteTallies,
  createDefaultDerbyState,
  DERBY_DURATION_MS,
  getDerbyRacer,
  getDerbyRacers,
  getDerbyRacerNameOverrides,
  getDerbyTheme,
  type DerbyRacerId,
  WONDERBAR_RACERS,
  DERBY_RACERS,
} from "@/lib/derby/types";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";

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
  const finished = game.phase === "finished";
  const canPickWinner = game.phase === "idle";
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
    if (!canPickWinner) return;
    updateDerby((prev) => ({ ...prev, winnerId: id }));
  };

  const startRace = () => {
    if (!game.winnerId || racing) return;
    if (game.phase === "finished") return;
    updateDerby((prev) => ({
      ...prev,
      phase: "racing",
      raceId: prev.raceId || newRaceId(),
      startedAt: Date.now(),
      durationMs: DERBY_DURATION_MS,
      seed: Math.floor(Math.random() * 0x7fffffff),
      sequence: prev.sequence + 1,
    }));
  };

  const raceAgain = () => {
    void fetch("/api/derby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearVotes" }),
    }).catch(() => {});
    updateDerby((prev) => ({
      ...prev,
      phase: "idle",
      raceId: newRaceId(),
      startedAt: null,
      seed: 0,
      voteTallies: emptyDerbyVoteTallies(),
      sequence: prev.sequence + 1,
      showJoinQr: true,
    }));
  };

  const reset = () => {
    void fetch("/api/derby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearVotes" }),
    }).catch(() => {});
    updateDerby((prev) => ({
      ...createDefaultDerbyState(),
      theme: getDerbyTheme(prev),
      racerScale: clampDerbyRacerScale(prev.racerScale),
      racerNames: prev.racerNames ?? {},
      sequence: prev.sequence,
      raceId: newRaceId(),
    }));
  };

  useEffect(() => {
    if (game.phase !== "idle") return;
    if (game.raceId) return;
    updateDerby((prev) =>
      prev.phase === "idle" && !prev.raceId
        ? { ...prev, raceId: newRaceId() }
        : prev,
    );
  }, [game.phase, game.raceId, updateDerby]);

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
  const winningVotes = picked ? (game.voteTallies?.[picked.id] ?? 0) : 0;
  const racerNoun = theme === "wonderbar" ? "Toy" : "Horse";

  const voteTotal = racers.reduce(
    (sum, racer) => sum + (game.voteTallies?.[racer.id] ?? 0),
    0,
  );

  let statusText = "Pick a winner";
  if (game.phase === "idle" && picked) {
    statusText = `Ready — ${picked.name} to win`;
  } else if (game.phase === "racing") {
    statusText = picked
      ? `Racing — ${picked.name} (hidden from audience)`
      : "Racing";
  } else if (game.phase === "finished") {
    statusText = picked
      ? `Finished — ${picked.name} wins (${winningVotes} ${winningVotes === 1 ? "vote" : "votes"})`
      : "Finished";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Status
            </p>
            <p className="truncate text-sm font-semibold text-white">
              {statusText}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Phone votes
            </p>
            <p className="text-3xl font-bold tabular-nums text-amber-300">
              {voteTotal}
            </p>
          </div>
          {racing ? (
            <div className="flex shrink-0 items-center gap-2">
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
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {finished ? (
              <button
                type="button"
                onClick={raceAgain}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Race again
              </button>
            ) : (
              <button
                type="button"
                disabled={!game.winnerId || racing}
                onClick={startRace}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
              >
                Start race
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
            >
              Reset
            </button>
            {game.phase === "idle" ? (
              <button
                type="button"
                onClick={() =>
                  updateDerby((prev) => ({
                    ...prev,
                    showJoinQr: !prev.showJoinQr,
                  }))
                }
                className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
              >
                {game.showJoinQr ? "Hide QR code" : "Show QR code"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!spectatorShowingDerby && (
        <SpectatorScreenNotice>
          Spectator is not on Derby Race. Use the Spectator screen dropdown so
          the projector shows the race.
        </SpectatorScreenNotice>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Racers &amp; phone votes
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {racers.map((racer) => {
              const selected = game.winnerId === racer.id;
              const votes = game.voteTallies?.[racer.id] ?? 0;
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
                    disabled={!canPickWinner}
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
                    <span className="mt-3 block text-3xl font-bold tabular-nums text-amber-300">
                      {votes}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {votes === 1 ? "vote" : "votes"}
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

        {finished ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Race finished
            {picked
              ? ` — ${picked.name} wins with ${winningVotes} ${winningVotes === 1 ? "vote" : "votes"}`
              : ""}
            . Winner picks are locked. Use{" "}
            <span className="font-semibold">Race again</span> for a new round, or{" "}
            <span className="font-semibold">Reset</span> to clear the winner.
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
