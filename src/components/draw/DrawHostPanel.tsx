"use client";

import { useState } from "react";
import { useSuite } from "@/lib/suite-provider";

export function DrawHostPanel() {
  const { state, updateDraw } = useSuite();
  const [input, setInput] = useState("");

  const handleDraw = () => {
    const value = input.trim();
    if (!value) return;
    updateDraw((prev) => ({
      number: value,
      sequence: prev.sequence + 1,
    }));
  };

  const handleClear = () => {
    updateDraw((prev) => ({
      number: null,
      sequence: prev.sequence,
    }));
    setInput("");
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-6">
      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-2 text-xl font-bold text-white">Number Draw</h2>
        <p className="mb-6 text-sm text-neutral-400">
          Enter a contestant ticket number and draw it for the audience screen.
        </p>
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          Ticket number
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
          className="mb-4 w-full rounded-md border border-neutral-600 bg-neutral-700 px-4 py-3 text-2xl font-semibold tracking-wider text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDraw}
            disabled={!input.trim()}
            className={`rounded-md px-6 py-3 font-semibold transition-colors ${
              input.trim()
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

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h3 className="mb-2 text-lg font-bold text-white">Audience status</h3>
        <p className="text-neutral-300">
          Showing:{" "}
          <span className="font-semibold text-white">
            {state.draw.number ?? "—"}
          </span>
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Draw sequence: {state.draw.sequence}
        </p>
      </div>
    </div>
  );
}
