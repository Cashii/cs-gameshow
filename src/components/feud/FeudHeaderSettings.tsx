"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";

export function FeudHeaderSettings() {
  const { state, updateFeud } = useSuite();
  const [open, setOpen] = useState(false);
  const showAnswerScores = state.feud.showAnswerScores;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Friendly Feud settings"
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
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-neutral-200">
                Answer scores
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showAnswerScores}
                aria-label="Toggle answer scores"
                onClick={() =>
                  updateFeud((prev) => ({
                    ...prev,
                    showAnswerScores: !prev.showAnswerScores,
                  }))
                }
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  showAnswerScores ? "bg-emerald-500" : "bg-neutral-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    showAnswerScores ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
