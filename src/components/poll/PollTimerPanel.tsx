"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
import { useSuite } from "@/lib/suite-provider";
import {
  POLL_DURATION_PRESETS_MS,
  formatPollClock,
  formatPollPreset,
  pausePollTimer,
  pollRemainingMs,
  resetPollTimer,
  setPollDuration,
  setPollTimerEnabled,
  startPollTimer,
} from "@/lib/poll/types";

function durationParts(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.floor(totalSec / 60),
    seconds: totalSec % 60,
  };
}

export function PollTimerPanel() {
  const { state, updatePoll } = useSuite();
  const poll = state.poll;
  const [now, setNow] = useState(() => Date.now());
  const [customMinutes, setCustomMinutes] = useState(
    () => durationParts(poll.timerDurationMs).minutes,
  );
  const [customSeconds, setCustomSeconds] = useState(
    () => durationParts(poll.timerDurationMs).seconds,
  );

  useEffect(() => {
    const parts = durationParts(poll.timerDurationMs);
    setCustomMinutes(parts.minutes);
    setCustomSeconds(parts.seconds);
  }, [poll.timerDurationMs]);

  useEffect(() => {
    if (!poll.timerRunning || poll.timerEndsAt == null) return;
    const endsAt = poll.timerEndsAt;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 200);
    const delay = Math.max(0, endsAt - Date.now());
    const timeout = window.setTimeout(() => {
      updatePoll((prev) =>
        prev.timerRunning ? pausePollTimer(prev, Date.now()) : prev,
      );
    }, delay);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [poll.timerRunning, poll.timerEndsAt, updatePoll]);

  const remainingMs = pollRemainingMs(poll, now);
  const canStart = remainingMs > 0 || poll.timerDurationMs > 0;
  let timerActionLabel = "Start";
  if (poll.timerRunning) timerActionLabel = "Pause";
  else if (remainingMs > 0 && remainingMs < poll.timerDurationMs) {
    timerActionLabel = "Resume";
  }

  const applyCustomDuration = () => {
    const ms = (customMinutes * 60 + customSeconds) * 1000;
    updatePoll((prev) => setPollDuration(prev, ms));
  };

  const controlButtonClass =
    "inline-flex h-11 min-w-11 items-center justify-center rounded-md px-4 text-base font-semibold";

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-white">Countdown</h2>
        <span className="min-w-14 text-2xl font-bold tabular-nums text-white">
          {formatPollClock(remainingMs)}
        </span>
        <div className="ml-auto">
          <StatusSwitch
            checked={poll.timerEnabled}
            labelOn="Show"
            labelOff="Hide"
            ariaLabel="Show countdown on the big screen"
            onToggle={() =>
              updatePoll((prev) =>
                setPollTimerEnabled(prev, !prev.timerEnabled),
              )
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {POLL_DURATION_PRESETS_MS.map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() => updatePoll((prev) => setPollDuration(prev, ms))}
            className={`${controlButtonClass} w-full border border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700`}
          >
            {formatPollPreset(ms)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex h-11 w-full items-center gap-1.5 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Min
          <input
            type="number"
            min={0}
            max={10}
            aria-label="Minutes"
            value={customMinutes}
            onChange={(event) =>
              setCustomMinutes(
                Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0),
              )
            }
            className="h-full min-w-0 flex-1 bg-transparent text-center text-base font-semibold text-white tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
        <label className="flex h-11 w-full items-center gap-1.5 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Sec
          <input
            type="number"
            min={0}
            max={59}
            aria-label="Seconds"
            value={customSeconds}
            onChange={(event) =>
              setCustomSeconds(
                Math.max(
                  0,
                  Math.min(
                    59,
                    Number.parseInt(event.target.value || "0", 10) || 0,
                  ),
                ),
              )
            }
            className="h-full min-w-0 flex-1 bg-transparent text-center text-base font-semibold text-white tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
        <button
          type="button"
          onClick={applyCustomDuration}
          className={`${controlButtonClass} w-full border border-teal-500 bg-teal-600 text-white hover:bg-teal-500`}
        >
          Set
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={!canStart && !poll.timerRunning}
          onClick={() =>
            updatePoll((prev) =>
              prev.timerRunning
                ? pausePollTimer(prev)
                : startPollTimer(prev),
            )
          }
          className={`${controlButtonClass} gap-1.5 border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40`}
        >
          {poll.timerRunning ? <Pause size={18} /> : <Play size={18} />}
          {timerActionLabel}
        </button>
        <button
          type="button"
          onClick={() => updatePoll(resetPollTimer)}
          className={`${controlButtonClass} border border-neutral-600 bg-neutral-800 text-white hover:bg-neutral-700`}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
