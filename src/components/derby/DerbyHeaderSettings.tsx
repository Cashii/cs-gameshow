"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { Select } from "@/components/ui/Select";
import {
  createDefaultDerbyState,
  DERBY_THEME_OPTIONS,
  getDerbyTheme,
  isDerbyTheme,
  type DerbyTheme,
} from "@/lib/derby/types";

export function DerbyHeaderSettings() {
  const { state, updateDerby } = useSuite();
  const [open, setOpen] = useState(false);
  const game = state.derby ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);

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
  );
}
