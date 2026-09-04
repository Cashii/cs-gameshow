"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  PICTIONARY_DURATION_PRESETS_MS,
  createDefaultPictionaryState,
  formatPictionaryClock,
  formatPictionaryPreset,
  hideablePictionaryIndexes,
  pausePictionaryTimer,
  pictionaryRemainingMs,
  resetPictionaryTimer,
  setPictionaryDuration,
  startPictionaryTimer,
  togglePictionaryHiddenIndex,
  type PictionaryState,
} from "@/lib/pictionary/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperatorNotice } from "@/components/operator/OperatorNotice";
import { StatusSwitch } from "@/components/operator/StatusSwitch";

function durationParts(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.floor(totalSec / 60),
    seconds: totalSec % 60,
  };
}

export function PictionaryHostPanel() {
  const { state, updatePictionary } = useSuite();
  const game = state.pictionary ?? createDefaultPictionaryState();
  const spectatorLive = state.spectatorGame === "pictionary";
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [customMinutes, setCustomMinutes] = useState(
    () => durationParts(game.timerDurationMs).minutes,
  );
  const [customSeconds, setCustomSeconds] = useState(
    () => durationParts(game.timerDurationMs).seconds,
  );

  const patch = (updater: (prev: PictionaryState) => PictionaryState) => {
    updatePictionary(updater);
  };

  useEffect(() => {
    const parts = durationParts(game.timerDurationMs);
    setCustomMinutes(parts.minutes);
    setCustomSeconds(parts.seconds);
  }, [game.timerDurationMs]);

  useEffect(() => {
    if (!game.timerRunning || game.timerEndsAt == null) return;
    const endsAt = game.timerEndsAt;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        updatePictionary((prev) =>
          prev.timerRunning ? pausePictionaryTimer(prev, t) : prev,
        );
      }
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [game.timerRunning, game.timerEndsAt, updatePictionary]);

  const remainingMs = pictionaryRemainingMs(game, now);
  const canStart = remainingMs > 0 || game.timerDurationMs > 0;
  let timerActionLabel = "Start";
  if (game.timerRunning) timerActionLabel = "Pause";
  else if (remainingMs > 0 && remainingMs < game.timerDurationMs) {
    timerActionLabel = "Resume";
  }

  const applyCustomDuration = () => {
    const minutes = Number.isFinite(customMinutes) ? customMinutes : 0;
    const seconds = Number.isFinite(customSeconds) ? customSeconds : 0;
    const next = minutes * 60_000 + seconds * 1000;
    patch((prev) => setPictionaryDuration(prev, next));
  };

  const setWord = (word: string) => {
    const next = word.toUpperCase();
    patch((prev) => ({
      ...prev,
      word: next,
      hiddenIndexes: hideablePictionaryIndexes(next),
    }));
  };

  const hideable = hideablePictionaryIndexes(game.word);
  const hiddenSet = new Set(game.hiddenIndexes);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          <StatusSwitch
            checked={game.curtainCovered}
            disabled={!game.word.trim()}
            labelOn="Curtain covered"
            labelOff="Curtain open"
            ariaLabel="Cover curtain"
            onToggle={() =>
              patch((prev) => ({
                ...prev,
                curtainCovered: !prev.curtainCovered,
              }))
            }
          />
          <StatusSwitch
            checked={game.hintEnabled}
            disabled={!game.word.trim()}
            labelOn="Hint on"
            labelOff="Hint off"
            ariaLabel="Hint"
            onToggle={() =>
              patch((prev) => ({
                ...prev,
                hintEnabled: !prev.hintEnabled,
              }))
            }
          />
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RotateCcw size={16} />
            Reset game
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          {!spectatorLive && (
            <OperatorNotice>
              Spectator is not on Pictionary. Use the Spectator screen list so
              the projector shows the word, curtain, and clock.
            </OperatorNotice>
          )}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Word to draw
              </h2>
              <input
                type="text"
                value={game.word}
                onChange={(event) => setWord(event.target.value)}
                placeholder="ELEPHANT"
                autoCapitalize="characters"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-lg tracking-wide text-white uppercase placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
              />
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Hint letters
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Green = shown on screen. Blank = covered in the hint.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={hideable.length === 0}
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        hiddenIndexes: hideablePictionaryIndexes(prev.word),
                      }))
                    }
                    className="rounded-md border border-neutral-600 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
                  >
                    Cover all
                  </button>
                  <button
                    type="button"
                    disabled={game.hiddenIndexes.length === 0}
                    onClick={() =>
                      patch((prev) => ({ ...prev, hiddenIndexes: [] }))
                    }
                    className="rounded-md border border-neutral-600 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
                  >
                    Clear covers
                  </button>
                </div>
              </div>
              {hideable.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Type a word, then tap letters to cover or show them in the hint.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {game.word.split("").map((char, index) => {
                    if (char === " ") {
                      return (
                        <span
                          key={`gap-${index}-${char}`}
                          className="inline-block w-3"
                          aria-hidden
                        />
                      );
                    }
                    const hidden = hiddenSet.has(index);
                    const letter = char;
                    return (
                      <button
                        key={`letter-${index}-${letter}`}
                        type="button"
                        aria-pressed={!hidden}
                        title={
                          hidden
                            ? `Show ${letter} in hint`
                            : `Cover ${letter} in hint`
                        }
                        onClick={() =>
                          patch((prev) => ({
                            ...prev,
                            hiddenIndexes: togglePictionaryHiddenIndex(
                              prev.hiddenIndexes,
                              index,
                            ),
                          }))
                        }
                        className={`inline-flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-2 ${
                          hidden
                            ? "border-dashed border-neutral-600 bg-neutral-950 text-neutral-400"
                            : "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]"
                        }`}
                      >
                        <span
                          className={`text-base font-bold uppercase leading-none ${
                            hidden ? "opacity-70" : ""
                          }`}
                        >
                          {char}
                        </span>
                        <span
                          className={`text-[0.65rem] font-semibold tracking-wide uppercase ${
                            hidden ? "text-neutral-500" : "text-emerald-400"
                          }`}
                        >
                          {hidden ? "Covered" : "Shown"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Timer
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-16 text-3xl font-bold tabular-nums text-white">
                  {formatPictionaryClock(remainingMs)}
                </span>
                <button
                  type="button"
                  disabled={!canStart && !game.timerRunning}
                  onClick={() =>
                    patch((prev) =>
                      prev.timerRunning
                        ? pausePictionaryTimer(prev)
                        : startPictionaryTimer(prev),
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                >
                  {game.timerRunning ? <Pause size={16} /> : <Play size={16} />}
                  {timerActionLabel}
                </button>
                <button
                  type="button"
                  onClick={() => patch(resetPictionaryTimer)}
                  className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
                >
                  Reset clock
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PICTIONARY_DURATION_PRESETS_MS.map((ms) => {
                const selected = game.timerDurationMs === ms;
                return (
                  <button
                    key={ms}
                    type="button"
                    onClick={() =>
                      patch((prev) => setPictionaryDuration(prev, ms))
                    }
                    className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold ${
                      selected
                        ? "bg-fuchsia-500 text-white"
                        : "border border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-neutral-500"
                    }`}
                  >
                    {formatPictionaryPreset(ms)}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Minutes
                </span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={customMinutes}
                  onChange={(event) =>
                    setCustomMinutes(
                      Math.max(
                        0,
                        Number.parseInt(event.target.value || "0", 10),
                      ),
                    )
                  }
                  className="h-10 w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-white focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Seconds
                </span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={customSeconds}
                  onChange={(event) =>
                    setCustomSeconds(
                      Math.max(
                        0,
                        Math.min(
                          59,
                          Number.parseInt(event.target.value || "0", 10),
                        ),
                      ),
                    )
                  }
                  className="h-10 w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-white focus:border-sky-500 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={applyCustomDuration}
                className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Set duration
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Pictionary?"
        message="This clears the word, hint covers, and clock. The timer length stays."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() =>
          patch((prev) => ({
            ...createDefaultPictionaryState(),
            timerDurationMs: prev.timerDurationMs,
            timerRemainingMs: prev.timerDurationMs,
          }))
        }
      />
    </div>
  );
}
