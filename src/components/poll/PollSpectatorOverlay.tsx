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
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-neutral-950 px-8 py-10 pb-80 sm:px-16">
      <p className="text-sm font-semibold tracking-[0.28em] text-sky-400 uppercase">
        {live ? "Live results" : "Poll results"}
      </p>
      <h1
        className="mt-3 max-w-5xl text-center text-4xl font-bold text-white sm:text-6xl"
        style={{ fontFamily: "var(--font-oswald), Impact, sans-serif" }}
      >
        {poll.question.trim() || "Question?"}
      </h1>

      <ul className="mt-10 w-full max-w-4xl space-y-5">
        {poll.choices.map((choice) => {
          const pct = total > 0 ? Math.round((choice.votes / total) * 100) : 0;
          return (
            <li key={choice.id}>
              <div className="mb-2 flex items-end justify-between gap-4 text-white">
                <span className="text-xl font-semibold sm:text-3xl">
                  {choice.text}
                </span>
                <span className="shrink-0 text-2xl font-bold tabular-nums sm:text-4xl">
                  {pct}%
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-white/10 sm:h-5">
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
        <p className="mt-8 text-sm tracking-wide text-neutral-400 uppercase sm:text-base">
          Voting open
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <PlayerVoteQr />
      </div>
    </div>
  );
}
