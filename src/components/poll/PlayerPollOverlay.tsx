"use client";

import type { PollState } from "@/lib/poll/types";

const POLL_CHOICE_COLORS = [
  "border-teal-300 bg-teal-100 text-teal-950 hover:bg-teal-200",
  "border-sky-300 bg-sky-100 text-sky-950 hover:bg-sky-200",
  "border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200",
  "border-violet-300 bg-violet-100 text-violet-950 hover:bg-violet-200",
];

export function PlayerPollOverlay({
  poll,
  voted,
  checkingVote,
  loading,
  message,
  playerCode,
  onVote,
}: {
  poll: PollState;
  voted: boolean;
  checkingVote: boolean;
  loading: boolean;
  message: string;
  playerCode: string;
  onVote: (choiceId: string) => void;
}) {
  const question = poll.question.trim() || "Question?";
  const total = poll.choices.reduce((s, c) => s + c.votes, 0);
  const showResults = poll.status === "results" || poll.status === "closed";
  const canVote = poll.status === "open" && !voted && !checkingVote;

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-transparent px-4 py-8">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-teal-600 uppercase">
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
          <p className="mt-8 text-neutral-400">Loading…</p>
        ) : canVote ? (
          <div className="mt-8 w-full space-y-3">
            {poll.choices.map((choice, i) => (
              <button
                key={choice.id}
                type="button"
                disabled={loading}
                onClick={() => onVote(choice.id)}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-center text-lg font-semibold disabled:opacity-50 ${POLL_CHOICE_COLORS[i % POLL_CHOICE_COLORS.length]}`}
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : poll.status === "open" && voted ? (
          <p className="mt-8 text-lg font-semibold text-emerald-600">
            Thanks — your vote is in.
          </p>
        ) : (
          <ul className="mt-8 w-full space-y-3">
            {poll.choices.map((choice) => (
              <li key={choice.id}>
                <div className="flex items-center justify-center gap-4 text-white">
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
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-teal-100">
                    <div
                      className="mx-auto h-full rounded-full bg-teal-500 transition-all duration-500"
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

        {playerCode ? (
          <p className="mt-auto pt-10 text-center text-sm tracking-widest text-neutral-500">
            {playerCode}
          </p>
        ) : null}
      </div>
    </div>
  );
}
