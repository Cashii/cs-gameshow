"use client";

import { useEffect, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import type { TriviaChoiceId, TriviaStatus } from "@/lib/trivia/types";
import { OperatorNotice } from "@/components/operator/OperatorNotice";

function triviaStatusLabel(
  status: TriviaStatus,
  questionNumber: number,
  settingUpNext: boolean,
): string {
  switch (status) {
    case "open":
      return `Voting open · Q${questionNumber}`;
    case "locked":
      return `Locked · Q${questionNumber}`;
    case "revealed":
      return `Question ${questionNumber} closed`;
    case "finished":
      return "Winners";
    default:
      return settingUpNext
        ? `Set up question ${questionNumber}`
        : "Ready for question 1";
  }
}

function triviaStatusClass(
  status: TriviaStatus,
  settingUpNext: boolean,
  questionClosed: boolean,
): string {
  if (settingUpNext || questionClosed) return "text-sky-700";
  if (status === "open") return "text-emerald-600";
  if (status === "finished") return "text-amber-700";
  return "text-white";
}

export function TriviaHostPanel() {
  const { state, refreshSnapshot } = useSuite();
  const trivia = state.trivia;
  const [question, setQuestion] = useState(trivia.question || "");
  const [optionA, setOptionA] = useState(trivia.optionA || "True");
  const [optionB, setOptionB] = useState(trivia.optionB || "False");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [roster, setRoster] = useState<string[]>([]);

  const runAction = async (body: Record<string, unknown>) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      await refreshSnapshot();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trivia.status === "idle" && trivia.roundIndex === 0) {
      setRoster([]);
      return;
    }
    let cancelled = false;
    fetch("/api/trivia/roster", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { remaining?: string[] }) => {
        if (!cancelled) setRoster(data.remaining ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoster([]);
      });
    return () => {
      cancelled = true;
    };
  }, [trivia.status, trivia.remainingCount, trivia.roundIndex]);

  const questionNumber = trivia.roundIndex > 0 ? trivia.roundIndex : 1;
  const settingUpNext = trivia.status === "idle" && trivia.roundIndex > 1;
  const questionClosed =
    trivia.status === "revealed" && trivia.remainingCount > 1;

  useEffect(() => {
    setQuestion(trivia.question || "");
    setOptionA(trivia.optionA || "True");
    setOptionB(trivia.optionB || "False");
  }, [trivia.roundIndex, trivia.status]);

  const statusLabel = triviaStatusLabel(
    trivia.status,
    questionNumber,
    settingUpNext,
  );

  const survive = (survivingChoiceId: TriviaChoiceId) => {
    void runAction({ action: "reveal", survivingChoiceId });
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
      {!settingUpNext && !questionClosed ? (
        <div className="mb-4">
          <p
            className={`text-sm font-semibold ${triviaStatusClass(
              trivia.status,
              settingUpNext,
              questionClosed,
            )}`}
          >
            {statusLabel}
          </p>
        </div>
      ) : null}

      {settingUpNext ? (
        <OperatorNotice
          className="mb-6"
          tone="info"
          title={`Set up question ${questionNumber}`}
        >
          Previous question is closed. {trivia.remainingCount} remaining.
          Enter the next question, then open voting.
        </OperatorNotice>
      ) : null}

      {questionClosed ? (
        <OperatorNotice
          className="mb-6"
          title={`Question ${trivia.roundIndex} closed`}
        >
          {trivia.remainingCount} remaining. Start question{" "}
          {trivia.roundIndex + 1} or declare winners if this is your cut.
        </OperatorNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.9fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Question {questionNumber}
            </span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="True or false: …"
              autoFocus={settingUpNext}
              disabled={trivia.status === "open" || trivia.status === "locked"}
              className={`mt-1.5 w-full rounded-lg border bg-neutral-800 px-3 py-2.5 text-white disabled:opacity-60 ${
                settingUpNext
                  ? "border-sky-400 ring-2 ring-sky-400/40"
                  : "border-neutral-700"
              }`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Side A
              </span>
              <input
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                disabled={trivia.status === "open" || trivia.status === "locked"}
                className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Side B
              </span>
              <input
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                disabled={trivia.status === "open" || trivia.status === "locked"}
                className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white disabled:opacity-60"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {trivia.status === "idle" && (
              <button
                type="button"
                disabled={loading || !question.trim()}
                onClick={() =>
                  void runAction({
                    action: "open",
                    question,
                    optionA,
                    optionB,
                  })
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {settingUpNext
                  ? `Open question ${questionNumber}`
                  : "Open voting"}
              </button>
            )}
            {trivia.status === "open" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction({ action: "lock" })}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
              >
                Lock voting
              </button>
            )}
            {trivia.status === "locked" && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => survive("a")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
                >
                  Survive A — {trivia.optionA}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => survive("b")}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  Survive B — {trivia.optionB}
                </button>
              </>
            )}
            {(trivia.status === "revealed" || trivia.status === "finished") && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction({ action: "undoReveal" })}
                className="rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                {trivia.status === "finished" ? "Undo winners" : "Undo reveal"}
              </button>
            )}
            {trivia.status === "revealed" && trivia.remainingCount > 1 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction({ action: "nextQuestion" })}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                Start question {trivia.roundIndex + 1}
              </button>
            )}
            {((trivia.status === "revealed" && trivia.remainingCount > 0) ||
              (trivia.status === "idle" && trivia.remainingCount > 0)) && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction({ action: "declareWinners" })}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-40"
              >
                {trivia.remainingCount === 1
                  ? "Declare winner"
                  : `Declare ${trivia.remainingCount} winners`}
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={() => void runAction({ action: "resetSeries" })}
              className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:opacity-40"
            >
              Reset series
            </button>
          </div>
          {message ? <p className="text-sm text-neutral-400">{message}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Counts
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-white">
              {trivia.remainingCount}
              <span className="ml-2 text-lg font-medium text-neutral-500">
                remaining
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Field size {trivia.fieldSize} · answers in {trivia.answeredCount}
            </p>
            {trivia.status !== "idle" && trivia.status !== "open" ? null : (
              <ul className="mt-3 space-y-1 text-sm text-neutral-300">
                <li className="flex justify-between gap-3">
                  <span className="truncate">A · {trivia.optionA}</span>
                  <strong className="tabular-nums">{trivia.choiceACount}</strong>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="truncate">B · {trivia.optionB}</span>
                  <strong className="tabular-nums">{trivia.choiceBCount}</strong>
                </li>
              </ul>
            )}
            {(trivia.status === "locked" ||
              trivia.status === "revealed" ||
              trivia.status === "finished") && (
              <ul className="mt-3 space-y-1 text-sm text-neutral-300">
                <li className="flex justify-between gap-3">
                  <span className="truncate">A · {trivia.optionA}</span>
                  <strong className="tabular-nums">{trivia.choiceACount}</strong>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="truncate">B · {trivia.optionB}</span>
                  <strong className="tabular-nums">{trivia.choiceBCount}</strong>
                </li>
              </ul>
            )}
            {trivia.status === "finished" && trivia.winnerCodes.length > 0 ? (
              <div className="mt-3">
                <p className="text-lg font-bold text-amber-300">
                  {trivia.winnerCodes.length === 1 ? "Winner" : "Winners"}
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest text-white">
                  {trivia.winnerCodes.join("  ")}
                </p>
              </div>
            ) : null}
            {trivia.status === "revealed" && trivia.remainingCount === 0 ? (
              <p className="mt-3 text-sm text-amber-400">
                Nobody survived this side. Undo and pick the other side.
              </p>
            ) : null}
          </div>

          {roster.length > 0 && roster.length <= 20 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Remaining codes
              </p>
              <p className="mt-2 font-mono text-sm tracking-widest text-white">
                {roster.join("  ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
