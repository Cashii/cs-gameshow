"use client";

import { Minus, Plus } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  clampMessageBoardScale,
  DEFAULT_MESSAGE_BOARD_SCALE,
  MAX_MESSAGE_BOARD_SCALE,
  MESSAGE_BOARD_SCALE_STEP,
  MIN_MESSAGE_BOARD_SCALE,
} from "@/lib/message-board/types";

export function MessageBoardHostPanel() {
  const { state, updateMessageBoard } = useSuite();
  const text = state.messageBoard?.text ?? "";
  const scale = clampMessageBoardScale(state.messageBoard?.scale);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="text-lg font-bold text-white">Message board</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Type an announcement. Set Spectator to Message Board to show it on
          the projector.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-3">
        <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          Message size
        </span>
        <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-neutral-200">
          {Math.round(scale * 100)}%
        </span>
        <input
          type="range"
          min={MIN_MESSAGE_BOARD_SCALE}
          max={MAX_MESSAGE_BOARD_SCALE}
          step={MESSAGE_BOARD_SCALE_STEP}
          value={scale}
          aria-label="Message size"
          onChange={(e) =>
            updateMessageBoard((prev) => ({
              ...prev,
              scale: clampMessageBoardScale(Number.parseFloat(e.target.value)),
            }))
          }
          className="min-w-40 flex-1 accent-teal-500"
        />
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Smaller message"
            disabled={scale <= MIN_MESSAGE_BOARD_SCALE}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                scale: clampMessageBoardScale(
                  (prev.scale ?? DEFAULT_MESSAGE_BOARD_SCALE) -
                    MESSAGE_BOARD_SCALE_STEP,
                ),
              }))
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            aria-label="Larger message"
            disabled={scale >= MAX_MESSAGE_BOARD_SCALE}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                scale: clampMessageBoardScale(
                  (prev.scale ?? DEFAULT_MESSAGE_BOARD_SCALE) +
                    MESSAGE_BOARD_SCALE_STEP,
                ),
              }))
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            disabled={scale === DEFAULT_MESSAGE_BOARD_SCALE}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                scale: DEFAULT_MESSAGE_BOARD_SCALE,
              }))
            }
            className="ml-1 inline-flex h-10 items-center rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) =>
          updateMessageBoard((prev) => ({ ...prev, text: e.target.value }))
        }
        placeholder="Intermission — back in 10 minutes"
        rows={10}
        className="min-h-64 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-lg leading-relaxed text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => updateMessageBoard((prev) => ({ ...prev, text: "" }))}
          className="rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
