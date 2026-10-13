"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { Select } from "@/components/ui/Select";
import {
  clampDerbyRacerScale,
  createDefaultDerbyState,
  DERBY_THEME_OPTIONS,
  getDerbyTheme,
  isDerbyTheme,
  MAX_DERBY_RACER_SCALE,
  MIN_DERBY_RACER_SCALE,
  type DerbyTheme,
} from "@/lib/derby/types";

export function DerbyHeaderSettings() {
  const { state, updateDerby } = useSuite();
  const [open, setOpen] = useState(false);
  const game = state.derby ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);
  const racerScale = clampDerbyRacerScale(game.racerScale);
  const sizeLabel = theme === "wonderbar" ? "Toy size" : "Horse size";

  const setTheme = (next: DerbyTheme) => {
    updateDerby((prev) => ({ ...prev, theme: next }));
  };

  return (
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
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-neutral-200">
                    {sizeLabel}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-white">
                    {Math.round(racerScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_DERBY_RACER_SCALE}
                  max={MAX_DERBY_RACER_SCALE}
                  step={0.05}
                  value={racerScale}
                  aria-label={sizeLabel}
                  onChange={(e) =>
                    updateDerby((prev) => ({
                      ...prev,
                      racerScale: clampDerbyRacerScale(
                        Number.parseFloat(e.target.value),
                      ),
                    }))
                  }
                  className="w-full accent-sky-500"
                />
              </div>
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
          </div>
        </>
      )}
    </div>
  );
}
