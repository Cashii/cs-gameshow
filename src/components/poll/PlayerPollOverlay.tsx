"use client";

import type { PollState } from "@/lib/poll/types";

const UNSELECTED_CHOICE_CLASS =
  "border-neutral-600 bg-neutral-800 text-white hover:border-teal-400/70 hover:bg-neutral-700";
const SELECTED_CHOICE_CLASS =
  "border-teal-400 bg-teal-500 text-white shadow-[0_0_0_1px_rgba(45,212,191,0.5)]";

export function PlayerPollOverlay({
  poll,
  voted,
  selectedChoiceId,
  checkingVote,
  loading,
  message,
  playerCode,
  onVote,
}: {
  poll: PollState;
  voted: boolean;
  selectedChoiceId: string | null;
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
  const showCorrect =
    poll.correctAnswerRevealed && Boolean(poll.correctChoiceId);
  const showPercentages = poll.showPercentages !== false && showResults;

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-transparent px-4 py-8">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-teal-600 uppercase">
            {poll.status === "open"
              ? voted
                ? "Vote recorded"
                : "O69 Club Poll"
              : showCorrect
                ? "Correct answer"
                : showPercentages
                  ? "Poll results"
                  : "Poll closed"}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {question}
          </h1>

          {checkingVote && poll.status === "open" ? (
            <p className="mt-8 text-neutral-400">Loading…</p>
          ) : canVote || (poll.status === "open" && voted) ? (
            <div className="mt-8 w-full space-y-3">
              {poll.choices.map((choice) => {
                const selected = selectedChoiceId === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={loading || voted}
                    onClick={() => onVote(choice.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-2xl border-2 px-4 py-4 text-center text-lg font-semibold transition-colors disabled:opacity-100 ${
                      selected ? SELECTED_CHOICE_CLASS : UNSELECTED_CHOICE_CLASS
                    } ${voted && !selected ? "opacity-55" : ""} ${
                      loading || voted ? "cursor-default" : ""
                    }`}
                  >
                    {choice.text}
                    {voted && selected ? " ✓" : ""}
                  </button>
                );
              })}
              {voted ? (
                <p className="pt-2 text-base font-semibold text-emerald-400">
                  Thanks — your vote is in.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="mt-8 w-full space-y-3">
              {poll.choices.map((choice) => {
                const isCorrect =
                  showCorrect && choice.id === poll.correctChoiceId;
                const selected = selectedChoiceId === choice.id;
                return (
                  <li key={choice.id}>
                    <div
                      className={`flex items-center justify-center gap-4 rounded-2xl border-2 px-4 py-3 ${
                        selected
                          ? SELECTED_CHOICE_CLASS
                          : isCorrect
                            ? "border-emerald-400/80 bg-emerald-500/20 font-semibold text-emerald-100"
                            : "border-neutral-700 bg-neutral-900 text-white"
                      }`}
                    >
                      <span>
                        {choice.text}
                        {isCorrect ? " ✓" : ""}
                        {selected && !isCorrect ? " · your pick" : ""}
                      </span>
                      {showPercentages && (
                        <span className="font-bold tabular-nums">
                          {total > 0
                            ? Math.round((choice.votes / total) * 100)
                            : 0}
                          %
                        </span>
                      )}
                    </div>
                    {showPercentages && (
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className={`mx-auto h-full rounded-full transition-all duration-500 ${
                            isCorrect || selected
                              ? "bg-teal-400"
                              : "bg-neutral-500"
                          }`}
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
                );
              })}
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
