"use client";

import type { TriviaGameState } from "@/lib/trivia/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";

export function TriviaAudienceView({ trivia }: { trivia: TriviaGameState }) {
  const showSplit =
    trivia.status === "revealed" || trivia.status === "finished";
  const survivingLabel =
    trivia.survivingChoiceId === "a"
      ? trivia.optionA
      : trivia.survivingChoiceId === "b"
        ? trivia.optionB
        : null;

  return (
    <div className="studio-ui flex h-full w-full flex-col px-8 py-6 sm:px-12 sm:py-8">
      <div className="shrink-0 text-center">
        <h1
          className="mx-auto max-w-[92%] font-bold text-white"
          style={{
            fontFamily: "var(--font-oswald), Impact, sans-serif",
            fontSize: "clamp(3.25rem, 9vw, 10rem)",
            lineHeight: 1.05,
          }}
        >
          {trivia.question.trim() || "Stand by"}
        </h1>
      </div>
      <div className="mx-auto mt-8 grid w-full max-w-5xl shrink-0 grid-cols-2 gap-6">
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border px-4 py-8 text-center ${
            showSplit && trivia.survivingChoiceId === "a"
              ? "border-emerald-500 bg-emerald-500/20"
              : "border-orange-300 bg-orange-500/10"
          }`}
        >
          <p className="text-2xl font-bold text-white sm:text-4xl">
            {trivia.optionA}
          </p>
          {showSplit ? (
            <p className="mt-3 text-xl tabular-nums text-neutral-300 sm:text-2xl">
              {trivia.choiceACount}
            </p>
          ) : null}
        </div>
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border px-4 py-8 text-center ${
            showSplit && trivia.survivingChoiceId === "b"
              ? "border-emerald-500 bg-emerald-500/20"
              : "border-sky-400 bg-sky-500/10"
          }`}
        >
          <p className="text-2xl font-bold text-white sm:text-4xl">
            {trivia.optionB}
          </p>
          {showSplit ? (
            <p className="mt-3 text-xl tabular-nums text-neutral-300 sm:text-2xl">
              {trivia.choiceBCount}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto mt-6 flex min-h-0 w-full max-w-6xl flex-1 items-stretch justify-center gap-10">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <p className="text-6xl font-bold tabular-nums text-white sm:text-8xl">
            {trivia.status === "idle" && trivia.roundIndex === 0
              ? "—"
              : trivia.remainingCount}
          </p>
          <p className="mt-2 text-lg tracking-[0.2em] text-neutral-400 uppercase">
            {trivia.status === "open"
              ? `${trivia.answeredCount} answers in`
              : trivia.status === "finished"
                ? trivia.winnerCodes.length === 1
                  ? `Winner ${trivia.winnerCodes[0] ?? ""}`
                  : `${trivia.remainingCount} winners`
                : survivingLabel
                  ? `${survivingLabel} survives`
                  : "Remaining"}
          </p>
          {trivia.status === "finished" && trivia.winnerCodes.length > 1 ? (
            <p className="mt-4 max-w-4xl font-mono text-xl tracking-widest text-amber-600 sm:text-2xl">
              {trivia.winnerCodes.join("  ")}
            </p>
          ) : null}
        </div>
        <div className="min-h-0 w-[min(28vw,18rem)] shrink-0">
          <PlayerVoteQr label="Scan to play" />
        </div>
      </div>
    </div>
  );
}
