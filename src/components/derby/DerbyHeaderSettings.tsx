"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { Select } from "@/components/ui/Select";
import {
  clampDerbyDurationMs,
  createDefaultDerbyState,
  DERBY_THEME_OPTIONS,
  getDerbyTheme,
  isDerbyTheme,
  MAX_DERBY_DURATION_MS,
  MIN_DERBY_DURATION_MS,
  type DerbyTheme,
} from "@/lib/derby/types";

export function DerbyHeaderSettings() {
  const { state, updateDerby } = useSuite();
  const [open, setOpen] = useState(false);
  const game = state.derby ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);
  const racing = game.phase === "racing";
  const durationSeconds = Math.round(game.durationMs / 1000);
  const [secondsDraft, setSecondsDraft] = useState(String(durationSeconds));

  useEffect(() => {
    setSecondsDraft(String(durationSeconds));
  }, [durationSeconds]);

  const setTheme = (next: DerbyTheme) => {
    updateDerby((prev) => ({ ...prev, theme: next }));
  };

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

  return (
    <div className="flex items-center gap-3">
      <label className="flex h-10 items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        <span>Race length</span>
        <input
          type="number"
          min={Math.round(MIN_DERBY_DURATION_MS / 1000)}
          max={Math.round(MAX_DERBY_DURATION_MS / 1000)}
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
          className="w-14 bg-transparent text-center text-sm font-semibold text-white tabular-nums focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-neutral-500 normal-case">sec</span>
      </label>
      <div className="relative">
        <button
          type="button"
          aria-label="Derby Race settings"
          title="Settings"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          <Settings size={18} />
        </button>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default border-0 bg-transparent"
            />
            <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-80 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
              <p className="mb-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Settings
              </p>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-200">
                  Theme
                </p>
                <Select
                  aria-label="Derby theme"
                  value={theme}
                  onValueChange={(value) => {
                    if (isDerbyTheme(value)) setTheme(value);
                  }}
                  options={DERBY_THEME_OPTIONS}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
