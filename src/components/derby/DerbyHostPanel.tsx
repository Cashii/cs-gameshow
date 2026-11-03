"use client";

import { useEffect, useState } from "react";
import { Minus, Play, Plus, RotateCcw } from "lucide-react";
import { JoinQrToggleButton } from "@/components/ui/JoinQrToggleButton";
import { useSuite } from "@/lib/suite-provider";
import {
  clampDerbyDurationMs,
  clampDerbyRacerScale,
  emptyDerbyVoteTallies,
  createDefaultDerbyState,
  DERBY_DURATION_MS,
  MAX_DERBY_DURATION_MS,
  MAX_DERBY_RACER_SCALE,
  MIN_DERBY_DURATION_MS,
  MIN_DERBY_RACER_SCALE,
  getDerbyRacer,
  getDerbyRacers,
  getDerbyRacerNameOverrides,
  getDerbyTheme,
  type DerbyRacerId,
  WONDERBAR_RACERS,
  DERBY_RACERS,
} from "@/lib/derby/types";
import { DerbyHorse } from "@/components/derby/DerbyHorse";
import { DerbyToy } from "@/components/derby/DerbyToy";
import { DerbyHeaderSettings } from "@/components/derby/DerbyHeaderSettings";
import { publishDerbyClock } from "@/lib/derby/clock";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";

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

function DerbyResetIconButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip content="Reset race?" delayDuration={0} size="md">
      <button
        type="button"
        aria-label="Reset race?"
        disabled={disabled}
        onClick={onClick}
        className="inline-flex h-10 min-w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-white hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw size={18} />
        <span className="text-[10px] font-semibold leading-none tracking-wide uppercase">
          Reset
        </span>
      </button>
    </Tooltip>
  );
}

export function DerbyHostPanel() {
  const { state, updateDerby } = useSuite();
  const game = state.derby ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);
  const nameOverrides = getDerbyRacerNameOverrides(game, theme);
  const racers = getDerbyRacers(theme, nameOverrides);
  const [now, setNow] = useState(() => Date.now());
  const durationSeconds = Math.round(game.durationMs / 1000);
  const [secondsDraft, setSecondsDraft] = useState(String(durationSeconds));
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const racing = game.phase === "racing";
  const finished = game.phase === "finished";
  const canPickWinner = game.phase === "idle";

  useEffect(() => {
    setSecondsDraft(String(durationSeconds));
  }, [durationSeconds]);

  const commitDurationSeconds = (raw: string) => {
    if (racing) {
      setSecondsDraft(String(durationSeconds));
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setSecondsDraft(String(durationSeconds));
      return;
    }
    const nextMs = clampDerbyDurationMs(parsed * 1000);
    setSecondsDraft(String(Math.round(nextMs / 1000)));
    updateDerby((prev) => ({
      ...prev,
      durationMs: nextMs,
    }));
  };

  const nudgeDuration = (delta: number) => {
    const parsed = Number.parseInt(secondsDraft, 10);
    const base = Number.isFinite(parsed) ? parsed : durationSeconds;
    commitDurationSeconds(String(base + delta));
  };

  const minDurationSeconds = Math.round(MIN_DERBY_DURATION_MS / 1000);
  const maxDurationSeconds = Math.round(MAX_DERBY_DURATION_MS / 1000);
  const shownDurationSeconds = Number.parseInt(secondsDraft, 10);
  const durationSecondsForLimits = Number.isFinite(shownDurationSeconds)
    ? shownDurationSeconds
    : durationSeconds;

  useEffect(() => {
    if (game.phase !== "racing" || game.startedAt == null) return;

    const startedAt = game.startedAt;
    const durationMs = game.durationMs;
    let ended = false;
    let raf = 0;

    const tick = (updateClock: boolean) => {
      if (ended) return;
      const t = Date.now();
      publishDerbyClock(startedAt, durationMs);
      if (updateClock) setNow(t);
      if (t - startedAt >= durationMs) {
        ended = true;
        setNow(t);
        updateDerby((prev) =>
          prev.phase === "racing" ? { ...prev, phase: "finished" } : prev,
        );
      }
    };

    const frame = () => {
      tick(false);
      if (!ended) raf = requestAnimationFrame(frame);
    };

    tick(true);
    raf = requestAnimationFrame(frame);
    const id = window.setInterval(() => tick(true), 100);
    return () => {
      ended = true;
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
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
      durationMs: prev.durationMs > 0 ? prev.durationMs : DERBY_DURATION_MS,
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
  const racerScale = clampDerbyRacerScale(game.racerScale);

  const setRacerScale = (next: number) => {
    updateDerby((prev) => ({
      ...prev,
      racerScale: clampDerbyRacerScale(next),
    }));
  };

  const voteTotal = racers.reduce(
    (sum, racer) => sum + (game.voteTallies?.[racer.id] ?? 0),
    0,
  );
  const canReset =
    game.phase !== "idle" ||
    game.winnerId != null ||
    voteTotal > 0 ||
    game.startedAt != null ||
    game.seed !== 0;

  let statusText = "Select a winner";
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
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
        <div>
          <div className="mb-6 flex w-full flex-col items-center justify-center gap-2 py-4 text-center">
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Status
            </p>
            <p className="w-full px-2 text-4xl font-bold tracking-tight text-pretty text-white sm:text-5xl sm:whitespace-nowrap">
              {statusText}
            </p>
            {racing ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Time left
                </p>
                <p
                  className={`text-7xl font-bold tabular-nums tracking-tight sm:text-8xl ${
                    remaining <= 5_000 ? "text-amber-300" : "text-white"
                  }`}
                  aria-live="polite"
                >
                  {formatClock(remaining)}
                </p>
              </div>
            ) : null}
            {game.phase === "idle" && game.winnerId ? (
              <div className="derby-start-appear mt-6 flex w-full justify-center">
                <button
                  type="button"
                  onClick={startRace}
                  className="inline-flex h-16 w-full max-w-md items-center justify-center gap-3 rounded-xl bg-blue-600 px-8 text-xl font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500"
                >
                  <Play size={28} />
                  Start race ({durationSeconds}s)
                </button>
              </div>
            ) : null}
            {finished ? (
              <div className="derby-start-appear mt-6 flex w-full justify-center">
                <button
                  type="button"
                  onClick={raceAgain}
                  className="inline-flex h-16 w-full max-w-md items-center justify-center gap-3 rounded-xl bg-blue-600 px-8 text-xl font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500"
                >
                  <RotateCcw size={28} />
                  Race again
                </button>
              </div>
            ) : null}
          </div>
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
                    canPickWinner ? "cursor-pointer" : ""
                  } ${
                    selected
                      ? "border-white bg-neutral-800 ring-2 ring-white/80"
                      : "border-neutral-700 bg-neutral-900"
                  }`}
                >
                  <button
                    type="button"
                    disabled={!canPickWinner}
                    onClick={() => pickWinner(racer.id)}
                    className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div
                      className="mx-auto mb-2 flex h-20 w-full items-center justify-center"
                      aria-hidden
                    >
                      <div
                        className="h-full [&_.derby-toy]:h-full [&_.derby-toy]:w-full [&_svg]:h-full [&_svg]:w-full"
                        style={{
                          aspectRatio:
                            theme === "wonderbar" ? "280 / 176" : "220 / 148",
                        }}
                      >
                        {theme === "wonderbar" ? (
                          <DerbyToy racer={racer} />
                        ) : (
                          <DerbyHorse racer={racer} />
                        )}
                      </div>
                    </div>
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
          <div className="mt-4 flex items-baseline justify-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Total phone votes
            </span>
            <span className="text-2xl font-bold tabular-nums text-amber-300">
              {voteTotal}
            </span>
          </div>
        </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-wrap items-center justify-start gap-3">
            <DerbyResetIconButton
              disabled={!canReset}
              onClick={() => setConfirmResetOpen(true)}
            />
            {game.phase === "idle" ? (
              <JoinQrToggleButton
                active={Boolean(game.showJoinQr)}
                onClick={() =>
                  updateDerby((prev) => ({
                    ...prev,
                    showJoinQr: !prev.showJoinQr,
                  }))
                }
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Race length
            </span>
            <button
              type="button"
              aria-label="Decrease race length"
              disabled={racing || durationSecondsForLimits <= minDurationSeconds}
              onClick={() => nudgeDuration(-1)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Minus size={18} />
            </button>
            <input
              type="number"
              min={minDurationSeconds}
              max={maxDurationSeconds}
              step={1}
              disabled={racing}
              aria-label="Race length in seconds"
              value={secondsDraft}
              onChange={(event) => setSecondsDraft(event.target.value)}
              onBlur={() => commitDurationSeconds(secondsDraft)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="h-10 w-16 rounded-md border border-neutral-600 bg-neutral-800 text-center text-sm font-semibold text-white tabular-nums focus:border-sky-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="Increase race length"
              disabled={racing || durationSecondsForLimits >= maxDurationSeconds}
              onClick={() => nudgeDuration(1)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Plus size={18} />
            </button>
            <span className="text-sm font-semibold text-neutral-400">sec</span>
            <span
              className="mx-1 h-6 w-px shrink-0 bg-neutral-600"
              aria-hidden
            />
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Racer Size
            </span>
            <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-neutral-300">
              {Math.round(racerScale * 100)}%
            </span>
            <button
              type="button"
              aria-label="Decrease racer size"
              disabled={racerScale <= MIN_DERBY_RACER_SCALE}
              onClick={() => setRacerScale(racerScale - 0.1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              aria-label="Increase racer size"
              disabled={racerScale >= MAX_DERBY_RACER_SCALE}
              onClick={() => setRacerScale(racerScale + 0.1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex items-center justify-end">
            <DerbyHeaderSettings />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset race?"
        message="This clears the winner, phone votes, and race progress so you can start fresh."
        confirmLabel="Reset Race"
        variant="danger"
        onConfirm={reset}
      />
    </div>
  );
}
