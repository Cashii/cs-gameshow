"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  MAX_QUESTION_TIME_TEAMS,
  MIN_QUESTION_TIME_TEAMS,
  QUESTION_TIME_DURATION_PRESETS_MS,
  clampQuestionTimeScore,
  createDefaultQuestionTimeState,
  createQuestionTimeTeam,
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

  const adjustScore = (teamId: string, delta: number) => {
    patch((prev) => ({
      ...prev,
      teams: prev.teams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              score: clampQuestionTimeScore(team.score + delta),
            }
          : team,
      ),
    }));
  };

  const addTeam = () => {
    if (game.teams.length >= MAX_QUESTION_TIME_TEAMS) return;
    patch((prev) => ({
      ...prev,
      teams: [
        ...prev.teams,
        createQuestionTimeTeam(`Team ${prev.teams.length + 1}`),
      ],
    }));
  };

  const removeTeam = (teamId: string) => {
    if (game.teams.length <= MIN_QUESTION_TIME_TEAMS) return;
    patch((prev) => ({
      ...prev,
      teams: prev.teams.filter((team) => team.id !== teamId),
    }));
  };

  const resetScores = () => {
    patch((prev) => ({
      ...prev,
      teams: prev.teams.map((team) => ({ ...team, score: 0 })),
    }));
  };

  const resetGame = () => {
    patch((prev) => ({
      ...createDefaultQuestionTimeState(),
      title: prev.title,
      teams: prev.teams.map((team) => ({ ...team, score: 0 })),
      timerDurationMs: prev.timerDurationMs,
      timerRemainingMs: prev.timerDurationMs,
    }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          {!spectatorLive && (
            <OperatorNotice>
              Spectator is not on Question Time. Use the Spectator screen list so
              the projector shows the question, scores, and clock.
            </OperatorNotice>
          )}

          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
            <section className="flex h-full min-w-0 flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
              <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Title
              </h3>
              <input
                type="text"
                value={game.title}
                onChange={(event) =>
                  patch((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Question Time"
                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
              />
            </section>

            <section className="flex h-full min-w-0 flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Question
              </h3>
              <textarea
                value={game.question}
                onChange={(event) =>
                  patch((prev) => ({ ...prev, question: event.target.value }))
                }
                placeholder="Who is more likely to leave dishes in the sink?"
                rows={6}
                className="min-h-28 w-full flex-1 resize-y rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-lg leading-relaxed text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
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
            </section>

            <section className="flex h-full min-w-0 flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
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

            <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Teams ({game.teams.length}/{MAX_QUESTION_TIME_TEAMS})
                </h3>
                <button
                  type="button"
                  disabled={game.teams.length >= MAX_QUESTION_TIME_TEAMS}
                  onClick={addTeam}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                >
                  <Plus size={14} />
                  Add team
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {game.teams.map((team, index) => (
                  <article
                    key={team.id}
                    className="flex flex-col gap-3 rounded-xl border border-neutral-700 bg-neutral-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Team {index + 1}
                      </h4>
                      <button
                        type="button"
                        disabled={game.teams.length <= MIN_QUESTION_TIME_TEAMS}
                        onClick={() => removeTeam(team.id)}
                        className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300 disabled:opacity-30"
                        aria-label={`Remove team ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={team.name}
                      onChange={(event) =>
                        patch((prev) => ({
                          ...prev,
                          teams: prev.teams.map((entry) =>
                            entry.id === team.id
                              ? { ...entry, name: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      placeholder={`Team ${index + 1}`}
                      className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
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
                            teams: prev.teams.map((entry) =>
                              entry.id === team.id
                                ? {
                                    ...entry,
                                    score: clampQuestionTimeScore(
                                      Number.parseInt(
                                        event.target.value || "0",
                                        10,
                                      ),
                                    ),
                                  }
                                : entry,
                            ),
                          }))
                        }
                        className="h-10 w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white focus:border-sky-500 focus:outline-none"
                        aria-label={`${team.name.trim() || `Team ${index + 1}`} score`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[-1, 1, 5, 10].map((delta) => (
                        <button
                          key={`${team.id}-${delta}`}
                          type="button"
                          onClick={() => adjustScore(team.id, delta)}
                          className="inline-flex h-10 min-w-14 items-center justify-center rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Question Time?"
        message="This clears the question, scores, and clock. Title, team names, and the timer length stay."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={resetGame}
      />
    </div>
  );
}
