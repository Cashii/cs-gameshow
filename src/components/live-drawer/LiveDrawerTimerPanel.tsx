"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
import { ResetButton } from "@/components/ui/ResetButton";
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

  const controlButtonClass =
    "inline-flex h-11 min-w-11 items-center justify-center rounded-md px-4 text-base font-semibold";

  return (
    <section className="flex flex-col gap-3 px-3 py-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-white">Countdown</h2>
        <span className="min-w-14 text-2xl font-bold tabular-nums text-white">
          {formatLiveDrawerClock(remainingMs)}
        </span>
        <div className="ml-auto">
          <StatusSwitch
            checked={game.timerEnabled}
            labelOn="Show"
            labelOff="Hide"
            ariaLabel="Show countdown on the big screen"
            onToggle={() =>
              updateLiveDrawer((prev) =>
                setLiveDrawerTimerEnabled(prev, !prev.timerEnabled),
              )
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LIVE_DRAWER_DURATION_PRESETS_MS.map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() =>
              updateLiveDrawer((prev) => setLiveDrawerDuration(prev, ms))
            }
            className={`${controlButtonClass} w-full border border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700`}
          >
            {formatLiveDrawerPreset(ms)}
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
          disabled={!canStart && !game.timerRunning}
          onClick={() =>
            updateLiveDrawer((prev) =>
              prev.timerRunning
                ? pauseLiveDrawerTimer(prev)
                : startLiveDrawerTimer(prev),
            )
          }
          className={`${controlButtonClass} gap-1.5 border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40`}
        >
          {game.timerRunning ? <Pause size={18} /> : <Play size={18} />}
          {timerActionLabel}
        </button>
        <ResetButton onClick={() => updateLiveDrawer(resetLiveDrawerTimer)}>
          Reset Clock
        </ResetButton>
      </div>
    </section>
  );
}
