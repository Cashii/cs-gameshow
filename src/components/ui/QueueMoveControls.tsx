"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

const moveButtonClass =
  "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-600 bg-neutral-900 text-neutral-200 hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

export function QueueMoveControls({
  canMoveUp,
  canMoveDown,
  disabled = false,
  onMoveUp,
  onMoveDown,
  label = "item",
}: Readonly<{
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** Used in aria-labels, e.g. "question" or "item". */
  label?: string;
}>) {
  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled || !canMoveUp}
        onClick={onMoveUp}
        className={moveButtonClass}
        aria-label={`Move ${label} up`}
      >
        <ChevronUp size={28} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        disabled={disabled || !canMoveDown}
        onClick={onMoveDown}
        className={moveButtonClass}
        aria-label={`Move ${label} down`}
      >
        <ChevronDown size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
