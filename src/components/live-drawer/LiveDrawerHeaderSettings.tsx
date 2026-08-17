"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  clampLiveDrawerNumberScale,
  DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
  MAX_LIVE_DRAWER_NUMBER_SCALE,
  MIN_LIVE_DRAWER_NUMBER_SCALE,
} from "@/lib/live-drawer/types";

export function LiveDrawerHeaderSettings() {
  const { state, updateLiveDrawer } = useSuite();
  const [open, setOpen] = useState(false);
  const scale =
    state.liveDrawer.numberScale ?? DEFAULT_LIVE_DRAWER_NUMBER_SCALE;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Live Drawer settings"
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
          <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-72 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
            <p className="mb-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Settings
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-neutral-200">
                  Text size
                </span>
                <span className="text-sm font-semibold tabular-nums text-white">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={MIN_LIVE_DRAWER_NUMBER_SCALE}
                max={MAX_LIVE_DRAWER_NUMBER_SCALE}
                step={0.05}
                value={scale}
                onChange={(e) =>
                  updateLiveDrawer((prev) => ({
                    ...prev,
                    numberScale: clampLiveDrawerNumberScale(
                      Number.parseFloat(e.target.value),
                    ),
                  }))
                }
                className="w-full accent-sky-500"
              />
              <div className="flex justify-between text-xs text-neutral-500">
                <span>{Math.round(MIN_LIVE_DRAWER_NUMBER_SCALE * 100)}%</span>
                <button
                  type="button"
                  onClick={() =>
                    updateLiveDrawer((prev) => ({
                      ...prev,
                      numberScale: DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
                    }))
                  }
                  className="font-medium text-sky-400 hover:text-sky-300"
                >
                  Reset to default
                </button>
                <span>{Math.round(MAX_LIVE_DRAWER_NUMBER_SCALE * 100)}%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
