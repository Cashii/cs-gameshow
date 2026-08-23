"use client";

import type { PollState } from "@/lib/poll/types";

export function PlayerPollOverlay({
  poll,
  voted,
  checkingVote,
  loading,
  message,
  onVote,
}: {
  poll: PollState;
  voted: boolean;
  checkingVote: boolean;
  loading: boolean;
  message: string;
  onVote: (choiceId: string) => void;
}) {
  const question = poll.question.trim() || "Question?";
  const total = poll.choices.reduce((s, c) => s + c.votes, 0);
  const showResults = poll.status === "results" || poll.status === "closed";
  const canVote = poll.status === "open" && !voted && !checkingVote;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-neutral-950 px-4 py-8">
      <div className="w-full max-w-lg">
        <p className="text-sm font-semibold tracking-[0.2em] text-sky-400 uppercase">
          {poll.status === "open"
            ? voted
              ? "Vote recorded"
              : "Live poll"
            : "Poll results"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {question}
        </h1>

        {checkingVote && poll.status === "open" ? (
          <p className="mt-8 text-center text-neutral-400">Loading…</p>
        ) : canVote ? (
          <div className="mt-8 space-y-3">
            {poll.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                disabled={loading}
                onClick={() => onVote(choice.id)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 text-left text-lg font-semibold text-white hover:border-sky-500 hover:bg-neutral-800 disabled:opacity-50"
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : poll.status === "open" && voted ? (
          <p className="mt-8 text-center text-lg text-emerald-400">
            Thanks — your vote is in.
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {poll.choices.map((choice) => (
              <li key={choice.id}>
                <div className="flex items-center justify-between gap-4 text-white">
                  <span>{choice.text}</span>
                  {showResults && (
                    <span className="font-bold tabular-nums">
                      {total > 0
                        ? Math.round((choice.votes / total) * 100)
                        : 0}
                      %
                    </span>
                  )}
                </div>
                {showResults && (
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-500"
                      style={{
                        width: `${
                          total > 0
                            ? Math.round((choice.votes / total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {message && <p className="mt-4 text-sm text-red-400">{message}</p>}
      </div>
    </div>
  );
}
