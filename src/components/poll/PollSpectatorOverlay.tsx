"use client";

import type { PollState } from "@/lib/poll/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";

export function PollSpectatorOverlay({
  poll,
}: Readonly<{ poll: PollState }>) {
  if (poll.status === "idle") return null;

  const total = poll.choices.reduce((s, c) => s + c.votes, 0);
  const live = poll.status === "open";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-neutral-950 px-8 py-6 sm:px-16 sm:py-8">
      <div className="shrink-0 text-center">
        <p className="text-sm font-semibold tracking-[0.28em] text-sky-400 uppercase sm:text-base">
          {live ? "Live results" : "Poll results"}
        </p>
        <h1
          className="mt-2 font-bold text-white"
          style={{
            fontFamily: "var(--font-oswald), Impact, sans-serif",
            fontSize: "clamp(2.75rem, 7.5vw, 8rem)",
            lineHeight: 1.05,
          }}
        >
          {poll.question.trim() || "Question?"}
        </h1>
      </div>

      <ul className="mx-auto mt-6 max-h-[50%] w-full max-w-6xl shrink-0 space-y-6 overflow-auto">
        {poll.choices.map((choice) => {
          const pct = total > 0 ? Math.round((choice.votes / total) * 100) : 0;
          return (
            <li key={choice.id}>
              <div className="mb-2 flex items-end justify-between gap-6 text-white">
                <span
                  className="min-w-0 font-semibold"
                  style={{
                    fontSize: "clamp(1.75rem, 4.2vw, 4.75rem)",
                    lineHeight: 1.1,
                  }}
                >
                  {choice.text}
                </span>
                <span
                  className="shrink-0 font-bold tabular-nums"
                  style={{
                    fontSize: "clamp(2rem, 5vw, 5.5rem)",
                    lineHeight: 1,
                  }}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-5 overflow-hidden rounded-full bg-white/10 sm:h-7">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {live && (
        <div className="mx-auto mt-4 min-h-0 w-full min-w-0 flex-1">
          <PlayerVoteQr />
        </div>
      )}
    </div>
  );
}
