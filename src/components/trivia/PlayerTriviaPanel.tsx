"use client";

import { LoaderCircle } from "lucide-react";
import type { TriviaChoiceId, TriviaGameState, TriviaMe } from "@/lib/trivia/types";
import { triviaChoiceIdAt } from "@/lib/trivia/types";
import "@/styles/trivia-audience.css";

export function PlayerTriviaPanel({
  trivia,
  deviceId,
  playerCode,
  me,
  mePending = false,
  loading,
  message,
  onVote,
}: {
  trivia: TriviaGameState;
  deviceId: string;
  playerCode: string;
  me: TriviaMe | null;
  /** True while /me is refetching after a status change — avoid flash of stale outcome. */
  mePending?: boolean;
  loading: boolean;
  message: string;
  onVote: (choiceId: TriviaChoiceId) => void;
}) {
  const fieldSet =
    trivia.roundIndex > 1 ||
    trivia.status === "revealed" ||
    trivia.status === "finished";

  // Use the known vote immediately on reveal — don't wait on /me (that was freezing the UI).
  if (
    (trivia.status === "revealed" || trivia.status === "finished") &&
    me?.choiceId &&
    trivia.survivingChoiceId
  ) {
    const survived = me.choiceId === trivia.survivingChoiceId;
    if (!survived) {
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
    if (trivia.status === "finished" || me.winner) {
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

  // Only hold the closed board when we cannot compute an outcome yet.
  if (
    mePending &&
    (trivia.status === "revealed" || trivia.status === "finished")
  ) {
    return (
      <VoteScreen
        trivia={trivia}
        playerCode={playerCode}
        loading={false}
        message=""
        selectedChoiceId={me?.choiceId ?? null}
        interactive={false}
        statusMessage="Voting is closed"
        onVote={onVote}
      />
    );
  }

  if (trivia.status === "open" && me?.canVote) {
    return (
      <VoteScreen
        trivia={trivia}
        playerCode={playerCode}
        loading={loading}
        message={message}
        selectedChoiceId={null}
        interactive
        onVote={onVote}
      />
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
      <VoteScreen
        trivia={trivia}
        playerCode={playerCode}
        loading={false}
        message=""
        selectedChoiceId={me?.choiceId ?? null}
        interactive={false}
        statusMessage="Voting is closed"
        onVote={onVote}
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

function VoteScreen({
  trivia,
  playerCode,
  loading,
  message,
  selectedChoiceId,
  interactive,
  statusMessage,
  onVote,
}: {
  trivia: TriviaGameState;
  playerCode: string;
  loading: boolean;
  message: string;
  selectedChoiceId: TriviaChoiceId | null;
  interactive: boolean;
  statusMessage?: string;
  onVote: (choiceId: TriviaChoiceId) => void;
}) {
  const options =
    trivia.options?.length >= 2
      ? trivia.options
      : [trivia.optionA, trivia.optionB];

  return (
    <div className="trivia-player-panel flex h-full w-full flex-col overflow-auto bg-transparent px-4 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center text-center">
        <p className="trivia-player-eyebrow">
          Question {trivia.roundIndex || 1}
        </p>
        <h1 className="trivia-player-question">
          {trivia.question.trim() || "Question?"}
        </h1>
        <div className="mt-8 grid w-full gap-3">
          {options.map((option, index) => {
            const choiceId = triviaChoiceIdAt(index);
            if (!choiceId) return null;
            const selected = selectedChoiceId === choiceId;
            return (
              <button
                key={choiceId}
                type="button"
                disabled={!interactive || loading}
                onClick={() => onVote(choiceId)}
                aria-pressed={selected}
                className={`trivia-player-choice trivia-player-choice-${choiceId}${
                  selected ? " trivia-player-choice-selected" : ""
                }${!interactive ? " trivia-player-choice-closed" : ""}`}
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" size={22} />
                ) : null}
                {option}
                {selected ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        {statusMessage ? (
          <p className="mt-5 text-base font-semibold text-amber-300">
            {statusMessage}
          </p>
        ) : null}
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
      ? "text-[#f472b6]"
      : tone === "win"
        ? "text-[#ffdc14]"
        : tone === "miss"
          ? "text-[#c084fc]"
          : "text-[#3dff8a]";
  return (
    <div className="trivia-player-panel flex h-full w-full flex-col items-center justify-center bg-transparent px-4 text-center">
      <p className="trivia-player-eyebrow">{eyebrow}</p>
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
