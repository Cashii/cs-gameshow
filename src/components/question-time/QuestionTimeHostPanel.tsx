"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  QUESTION_TIME_DURATION_PRESETS_MS,
  clampQuestionTimeScore,
  createDefaultQuestionTimeState,
  formatQuestionTimeClock,
  formatQuestionTimePreset,
  pauseQuestionTimeTimer,
  questionTimeRemainingMs,
  resetQuestionTimeTimer,
  setQuestionTimeDuration,
  startQuestionTimeTimer,
  type QuestionTimeState,
} from "@/lib/question-time/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperatorNotice } from "@/components/operator/OperatorNotice";

function durationParts(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.floor(totalSec / 60),
    seconds: totalSec % 60,
  };
}

export function QuestionTimeHostPanel() {
  const { state, updateQuestionTime } = useSuite();
  const game = state.questionTime ?? createDefaultQuestionTimeState();
  const spectatorLive = state.spectatorGame === "questionTime";
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [customMinutes, setCustomMinutes] = useState(
    () => durationParts(game.timerDurationMs).minutes,
  );
  const [customSeconds, setCustomSeconds] = useState(
    () => durationParts(game.timerDurationMs).seconds,
  );

  const patch = (updater: (prev: QuestionTimeState) => QuestionTimeState) => {
    updateQuestionTime(updater);
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
        updateQuestionTime((prev) =>
          prev.timerRunning ? pauseQuestionTimeTimer(prev, t) : prev,
        );
      }
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [game.timerRunning, game.timerEndsAt, updateQuestionTime]);

  const remainingMs = questionTimeRemainingMs(game, now);
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
    patch((prev) => setQuestionTimeDuration(prev, next));
  };

  const adjustScore = (side: "leftTeam" | "rightTeam", delta: number) => {
    patch((prev) => ({
      ...prev,
      [side]: {
        ...prev[side],
        score: clampQuestionTimeScore(prev[side].score + delta),
      },
    }));
  };

  const resetScores = () => {
    patch((prev) => ({
      ...prev,
      leftTeam: { ...prev.leftTeam, score: 0 },
      rightTeam: { ...prev.rightTeam, score: 0 },
    }));
  };

  const resetGame = () => {
    patch((prev) => ({
      ...createDefaultQuestionTimeState(),
      leftTeam: { ...prev.leftTeam, score: 0 },
      rightTeam: { ...prev.rightTeam, score: 0 },
      timerDurationMs: prev.timerDurationMs,
      timerRemainingMs: prev.timerDurationMs,
    }));
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex w-full flex-col gap-6 px-6 py-6">
        <div>
          <h2 className="text-lg font-bold text-white">Question Time</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Show a question, keep two team scores, and run a giant countdown
            while the couples play in the room. There is no player phone board.
          </p>
        </div>

        {!spectatorLive && (
          <OperatorNotice>
            Spectator is not on Question Time. Use the Spectator screen list so
            the projector shows the question, scores, and clock.
          </OperatorNotice>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetScores}
            className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Reset scores
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RotateCcw size={16} />
            Reset game
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Question
          </span>
          <textarea
            value={game.question}
            onChange={(event) =>
              patch((prev) => ({ ...prev, question: event.target.value }))
            }
            placeholder="Who is more likely to leave dishes in the sink?"
            rows={4}
            className="min-h-28 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-lg leading-relaxed text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!game.question.trim()}
              onClick={() => patch((prev) => ({ ...prev, question: "" }))}
              className="rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
            >
              Clear question
            </button>
          </div>
        </label>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["leftTeam", "rightTeam"] as const).map((key) => {
            const team = game[key];
            const label = key === "leftTeam" ? "Left team" : "Right team";
            return (
              <article
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  {label}
                </h3>
                <input
                  type="text"
                  value={team.name}
                  onChange={(event) =>
                    patch((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], name: event.target.value },
                    }))
                  }
                  placeholder={label}
                  className="h-10 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <span className="min-w-16 text-4xl font-bold tabular-nums text-white">
                    {team.score}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={team.score}
                    onChange={(event) =>
                      patch((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key],
                          score: clampQuestionTimeScore(
                            Number.parseInt(event.target.value || "0", 10),
                          ),
                        },
                      }))
                    }
                    className="h-10 w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-white focus:border-sky-500 focus:outline-none"
                    aria-label={`${label} score`}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[-1, 1, 5, 10].map((delta) => (
                    <button
                      key={`${key}-${delta}`}
                      type="button"
                      onClick={() => adjustScore(key, delta)}
                      className="inline-flex h-10 min-w-14 items-center justify-center rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Timer
              </h3>
              <p className="mt-1 text-4xl font-bold tabular-nums text-white">
                {formatQuestionTimeClock(remainingMs)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canStart && !game.timerRunning}
                onClick={() => {
                  const t = Date.now();
                  setNow(t);
                  patch((prev) =>
                    prev.timerRunning
                      ? pauseQuestionTimeTimer(prev, t)
                      : startQuestionTimeTimer(prev, t),
                  );
                }}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
              >
                {game.timerRunning ? <Pause size={16} /> : <Play size={16} />}
                {timerActionLabel}
              </button>
              <button
                type="button"
                onClick={() => patch(resetQuestionTimeTimer)}
                className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Reset clock
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUESTION_TIME_DURATION_PRESETS_MS.map((ms) => {
              const selected = game.timerDurationMs === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  onClick={() =>
                    patch((prev) => setQuestionTimeDuration(prev, ms))
                  }
                  className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold ${
                    selected
                      ? "bg-rose-500 text-white"
                      : "border border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-neutral-500"
                  }`}
                >
                  {formatQuestionTimePreset(ms)}
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
                    Math.max(0, Number.parseInt(event.target.value || "0", 10)),
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
                      Math.min(59, Number.parseInt(event.target.value || "0", 10)),
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

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Question Time?"
        message="This clears the question, scores, and clock. Team names and the timer length stay."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={resetGame}
      />
    </div>
  );
}
