"use client";

import { useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  LIVE_DRAWER_COLORS,
  getLiveDrawerColor,
} from "@/lib/live-drawer/types";

export function LiveDrawerHostPanel() {
  const { state, updateLiveDrawer } = useSuite();
  const [input, setInput] = useState("");
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  const handleDraw = () => {
    const value = input.trim();
    if (!value) return;
    updateLiveDrawer((prev) => ({
      ...prev,
      number: value,
      colorId: selectedColorId,
      sequence: prev.sequence + 1,
    }));
  };

  const handleClear = () => {
    updateLiveDrawer((prev) => ({
      ...prev,
      number: null,
      colorId: null,
      sequence: prev.sequence,
    }));
    setInput("");
  };

  const drawnColor = getLiveDrawerColor(state.liveDrawer.colorId);
  const canDraw = Boolean(input.trim());

  return (
    <div className="grid w-full grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-stretch">
      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-white">Audience status</h2>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Showing
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-wider text-white">
              {state.liveDrawer.number ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Color
            </p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
              {drawnColor ? (
                <>
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-white/40"
                    style={{ backgroundColor: drawnColor.hex }}
                  />
                  {drawnColor.name}
                </>
              ) : state.liveDrawer.number != null ? (
                <span className="text-neutral-400">No color</span>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
        <div className="flex-1 space-y-5 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">Controls</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Enter text and optionally a color. The color fills the audience
              background when drawn.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Text
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDraw();
              }}
              placeholder="e.g. 42"
              className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-4 py-3 text-2xl font-semibold tracking-wider text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedColorId(null)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  selectedColorId === null
                    ? "border-sky-400 bg-sky-600/30 text-white"
                    : "border-neutral-600 bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
                }`}
              >
                No color
              </button>
              {LIVE_DRAWER_COLORS.map((color) => {
                const active = selectedColorId === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColorId(color.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-sky-400 bg-sky-600/30 text-white"
                        : "border-neutral-600 bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-white/30"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-3 border-t border-neutral-700 bg-neutral-900/50 px-6 py-4">
          <button
            type="button"
            onClick={handleDraw}
            disabled={!canDraw}
            className={`rounded-md px-6 py-3 font-semibold transition-colors ${
              canDraw
                ? "bg-sky-600 text-white hover:bg-sky-700"
                : "cursor-not-allowed bg-neutral-700 text-neutral-500"
            }`}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-neutral-600 bg-neutral-700 px-6 py-3 font-semibold text-neutral-200 hover:bg-neutral-600"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
