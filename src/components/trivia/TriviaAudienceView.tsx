"use client";

import type { TriviaGameState } from "@/lib/trivia/types";

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
    <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-950 px-8 text-center">
      <p className="text-sm font-semibold tracking-[0.35em] text-sky-400 uppercase">
        Elimination Trivia
        {trivia.roundIndex > 0 ? ` · Q${trivia.roundIndex}` : ""}
      </p>
      <h1
        className="mt-4 max-w-5xl text-4xl font-bold text-white sm:text-6xl"
        style={{ fontFamily: "var(--font-oswald), Impact, sans-serif" }}
      >
        {trivia.question.trim() || "Stand by"}
      </h1>
      <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-6">
        <div
          className={`rounded-2xl border px-4 py-6 ${
            showSplit && trivia.survivingChoiceId === "a"
              ? "border-emerald-400 bg-emerald-500/15"
              : "border-neutral-700 bg-neutral-900"
          }`}
        >
          <p className="text-xs tracking-widest text-neutral-400 uppercase">A</p>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {trivia.optionA}
          </p>
          {showSplit ? (
            <p className="mt-3 text-xl tabular-nums text-neutral-300">
              {trivia.choiceACount}
            </p>
          ) : null}
        </div>
        <div
          className={`rounded-2xl border px-4 py-6 ${
            showSplit && trivia.survivingChoiceId === "b"
              ? "border-emerald-400 bg-emerald-500/15"
              : "border-neutral-700 bg-neutral-900"
          }`}
        >
          <p className="text-xs tracking-widest text-neutral-400 uppercase">B</p>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {trivia.optionB}
          </p>
          {showSplit ? (
            <p className="mt-3 text-xl tabular-nums text-neutral-300">
              {trivia.choiceBCount}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-10 text-7xl font-bold tabular-nums text-white sm:text-8xl">
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
        <p className="mt-4 max-w-4xl font-mono text-xl tracking-widest text-amber-300 sm:text-2xl">
          {trivia.winnerCodes.join("  ")}
        </p>
      ) : null}
    </div>
  );
}
