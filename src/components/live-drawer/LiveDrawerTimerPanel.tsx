"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
import { useSuite } from "@/lib/suite-provider";
import {
  LIVE_DRAWER_DURATION_PRESETS_MS,
  createDefaultLiveDrawerState,
  formatLiveDrawerClock,
  formatLiveDrawerPreset,
  liveDrawerRemainingMs,
  pauseLiveDrawerTimer,
  resetLiveDrawerTimer,
  setLiveDrawerDuration,
  setLiveDrawerTimerEnabled,
  startLiveDrawerTimer,
} from "@/lib/live-drawer/types";

function durationParts(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.floor(totalSec / 60),
    seconds: totalSec % 60,
  };
}

export function LiveDrawerTimerPanel() {
  const { state, updateLiveDrawer } = useSuite();
  const game = state.liveDrawer ?? createDefaultLiveDrawerState();
  const [now, setNow] = useState(() => Date.now());
  const [customMinutes, setCustomMinutes] = useState(
    () => durationParts(game.timerDurationMs).minutes,
  );
  const [customSeconds, setCustomSeconds] = useState(
    () => durationParts(game.timerDurationMs).seconds,
  );

  useEffect(() => {
    const parts = durationParts(game.timerDurationMs);
    setCustomMinutes(parts.minutes);
    setCustomSeconds(parts.seconds);
  }, [game.timerDurationMs]);

  useEffect(() => {
    if (!game.timerRunning || game.timerEndsAt == null) return;
    const endsAt = game.timerEndsAt;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 200);
    const delay = Math.max(0, endsAt - Date.now());
    const timeout = window.setTimeout(() => {
      updateLiveDrawer((prev) =>
        prev.timerRunning ? pauseLiveDrawerTimer(prev, Date.now()) : prev,
      );
    }, delay);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [game.timerRunning, game.timerEndsAt, updateLiveDrawer]);

  const remainingMs = liveDrawerRemainingMs(game, now);
  const canStart = remainingMs > 0 || game.timerDurationMs > 0;
  let timerActionLabel = "Start";
  if (game.timerRunning) timerActionLabel = "Pause";
  else if (remainingMs > 0 && remainingMs < game.timerDurationMs) {
    timerActionLabel = "Resume";
  }

  const applyCustomDuration = () => {
    const ms = (customMinutes * 60 + customSeconds) * 1000;
    updateLiveDrawer((prev) => setLiveDrawerDuration(prev, ms));
  };

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-white">Countdown</h2>
        <span className="min-w-14 text-2xl font-bold tabular-nums text-white">
          {formatLiveDrawerClock(remainingMs)}
        </span>
        <button
          type="button"
          disabled={!canStart && !game.timerRunning}
          onClick={() =>
            updateLiveDrawer((prev) =>
              prev.timerRunning
                ? pauseLiveDrawerTimer(prev)
                : startLiveDrawerTimer(prev),
            )
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
        >
          {game.timerRunning ? <Pause size={14} /> : <Play size={14} />}
          {timerActionLabel}
        </button>
        <button
          type="button"
          onClick={() => updateLiveDrawer(resetLiveDrawerTimer)}
          className="inline-flex h-8 items-center rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Reset
        </button>
        <div className="ml-auto">
          <StatusSwitch
            checked={game.timerEnabled}
            labelOn="Showing Countdown"
            labelOff="Countdown Hidden"
            ariaLabel="Show countdown on the big screen"
            onToggle={() =>
              updateLiveDrawer((prev) =>
                setLiveDrawerTimerEnabled(prev, !prev.timerEnabled),
              )
            }
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {LIVE_DRAWER_DURATION_PRESETS_MS.map((ms) => {
          const selected = game.timerDurationMs === ms;
          return (
            <button
              key={ms}
              type="button"
              onClick={() =>
                updateLiveDrawer((prev) => setLiveDrawerDuration(prev, ms))
              }
              className={`inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold ${
                selected
                  ? "bg-sky-500 text-white"
                  : "border border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-neutral-500"
              }`}
            >
              {formatLiveDrawerPreset(ms)}
            </button>
          );
        })}
        <label className="ml-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
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
            className="h-7 w-14 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
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
            className="h-7 w-14 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={applyCustomDuration}
          className="inline-flex h-7 items-center rounded-md border border-teal-500 bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-500"
        >
          Set
        </button>
      </div>
    </section>
  );
}
