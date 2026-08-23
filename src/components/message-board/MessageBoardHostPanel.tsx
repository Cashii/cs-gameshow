"use client";

import { useSuite } from "@/lib/suite-provider";

export function MessageBoardHostPanel() {
  const { state, updateMessageBoard } = useSuite();
  const text = state.messageBoard?.text ?? "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="text-lg font-bold text-white">Message board</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Type an announcement. Set Spectator to Message Board to show it on
          the projector.
        </p>
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
          onClick={() => updateMessageBoard(() => ({ text: "" }))}
          className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
