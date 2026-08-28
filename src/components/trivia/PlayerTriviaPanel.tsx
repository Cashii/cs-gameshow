"use client";

import type { TriviaChoiceId, TriviaGameState, TriviaMe } from "@/lib/trivia/types";

export function PlayerTriviaPanel({
  trivia,
  deviceId,
  playerCode,
  me,
  loading,
  message,
  onVote,
}: {
  trivia: TriviaGameState;
  deviceId: string;
  playerCode: string;
  me: TriviaMe | null;
  loading: boolean;
  message: string;
  onVote: (choiceId: TriviaChoiceId) => void;
}) {
  const fieldSet =
    trivia.roundIndex > 1 ||
    trivia.status === "revealed" ||
    trivia.status === "finished";

  if (me?.winner) {
    return (
      <StatusScreen
        eyebrow="Elimination Trivia"
        title="You're a winner"
        body={
          trivia.remainingCount === 1
            ? "You're the last one through."
            : `${trivia.remainingCount} winners — including you.`
        }
        playerCode={playerCode}
        tone="win"
      />
    );
  }

  if (me?.role === "eliminated") {
    return (
      <StatusScreen
        eyebrow="Elimination Trivia"
        title="You're out"
        body={`${trivia.remainingCount} still in.`}
        playerCode={playerCode}
        tone="out"
      />
    );
  }

  if (fieldSet && me?.role === "none") {
    return (
      <StatusScreen
        eyebrow="Elimination Trivia"
        title="Not in this round"
        body="You missed the first question."
        playerCode={playerCode}
        tone="miss"
      />
    );
  }

  if (trivia.status === "open" && me?.canVote) {
    return (
    <div className="flex h-full w-full flex-col overflow-auto bg-transparent px-4 py-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-teal-600 uppercase">
            Question {trivia.roundIndex || 1}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {trivia.question.trim() || "Question?"}
          </h1>
          <div className="mt-8 grid w-full gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => onVote("a")}
              className="w-full rounded-2xl border-2 border-orange-300 bg-orange-100 px-4 py-5 text-xl font-semibold text-orange-950 hover:bg-orange-200 disabled:opacity-50"
            >
              {trivia.optionA}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onVote("b")}
              className="w-full rounded-2xl border-2 border-sky-300 bg-sky-100 px-4 py-5 text-xl font-semibold text-sky-950 hover:bg-sky-200 disabled:opacity-50"
            >
              {trivia.optionB}
            </button>
          </div>
          {message ? <p className="mt-4 text-sm text-red-400">{message}</p> : null}
          {playerCode ? (
            <p className="mt-10 text-sm tracking-widest text-neutral-500">
              {playerCode}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (trivia.status === "open" && me?.voted) {
    return (
      <StatusScreen
        eyebrow="Answer locked"
        title="You're in"
        body="Waiting for the rest of the field…"
        playerCode={playerCode}
        tone="in"
      />
    );
  }

  if (trivia.status === "locked") {
    return (
      <StatusScreen
        eyebrow="Elimination Trivia"
        title="Answers locked"
        body="Waiting for the surviving side."
        playerCode={playerCode}
        tone="in"
      />
    );
  }

  if (trivia.status === "revealed" && me?.role === "active") {
    return (
      <StatusScreen
        eyebrow="Still in"
        title={`${trivia.remainingCount} remaining`}
        body="Get ready for the next question."
        playerCode={playerCode}
        tone="in"
      />
    );
  }

  return (
    <StatusScreen
      eyebrow="Elimination Trivia"
      title="Stand by"
      body={deviceId ? "Waiting for the next question." : ""}
      playerCode={playerCode}
      tone="in"
    />
  );
}

function StatusScreen({
  eyebrow,
  title,
  body,
  playerCode,
  tone,
}: {
  eyebrow: string;
  title: string;
  body: string;
  playerCode: string;
  tone: "in" | "out" | "miss" | "win";
}) {
  const titleColor =
    tone === "out"
      ? "text-rose-600"
      : tone === "win"
        ? "text-amber-500"
        : tone === "miss"
          ? "text-violet-600"
          : "text-teal-600";
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-transparent px-4 text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-teal-600 uppercase">
        {eyebrow}
      </p>
      <h1 className={`mt-3 text-4xl font-bold sm:text-5xl ${titleColor}`}>
        {title}
      </h1>
      {body ? <p className="mt-4 text-neutral-400">{body}</p> : null}
      {playerCode ? (
        <p className="mt-10 text-sm tracking-widest text-neutral-500">
          {playerCode}
        </p>
      ) : null}
    </div>
  );
}
