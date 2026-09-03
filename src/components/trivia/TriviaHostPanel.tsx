"use client";

import { useEffect, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import { createTriviaQueuedQuestion } from "@/lib/trivia/types";
import type {
  TriviaChoiceId,
  TriviaQueuedQuestion,
  TriviaStatus,
} from "@/lib/trivia/types";
import { OperatorNotice } from "@/components/operator/OperatorNotice";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

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
  const spectatorLive = state.spectatorGame === "trivia";
  const [question, setQuestion] = useState(trivia.question || "");
  const [optionA, setOptionA] = useState(trivia.optionA || "True");
  const [optionB, setOptionB] = useState(trivia.optionB || "False");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [roster, setRoster] = useState<string[]>([]);
  const [queueDraft, setQueueDraft] = useState<TriviaQueuedQuestion[]>(
    () => trivia.queue ?? [],
  );

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
    setQueueDraft(trivia.queue ?? []);
  }, [trivia.queue]);


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
  }, [trivia.roundIndex, trivia.status, trivia.question, trivia.optionA, trivia.optionB]);

  const statusLabel = triviaStatusLabel(
    trivia.status,
    questionNumber,
    settingUpNext,
  );

  const survive = (survivingChoiceId: TriviaChoiceId) => {
    void runAction({ action: "reveal", survivingChoiceId });
  };

  const saveQueue = (queue: TriviaQueuedQuestion[]) => {
    setQueueDraft(queue);
    void runAction({ action: "saveQueue", queue });
  };

  const persistQueueDraft = () => {
    setQueueDraft((current) => {
      void runAction({ action: "saveQueue", queue: current });
      return current;
    });
  };

  const queue = queueDraft;
  const history = trivia.history ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
      {!spectatorLive && (
        <OperatorNotice className="mb-6">
          Spectator is not on Elimination Trivia. Use the Spectator screen list
          so the projector shows the question.
        </OperatorNotice>
      )}
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
          {queue[0]?.question.trim()
            ? " The next queued question is loaded — open voting when ready."
            : " Enter the next question, then open voting."}
        </OperatorNotice>
      ) : null}

      {questionClosed ? (
        <OperatorNotice
          className="mb-6"
          title={`Question ${trivia.roundIndex} closed`}
        >
          {trivia.remainingCount} remaining. Start question{" "}
          {trivia.roundIndex + 1}
          {queue.length > 0 ? " (next queued question will load)" : ""} or
          declare winners if this is your cut.
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

          <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Upcoming questions ({queue.length})
              </h3>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  saveQueue([...queue, createTriviaQueuedQuestion()])
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                <Plus size={14} />
                Add to queue
              </button>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Stage questions ahead of time. Starting the next question pulls
                the first queued item.
              </p>
            ) : (
              <div className="space-y-3">
                {queue.map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-500">
                        Queued #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={loading || index === 0}
                          onClick={() => {
                            const next = [...queue];
                            const tmp = next[index - 1];
                            next[index - 1] = next[index];
                            next[index] = tmp;
                            saveQueue(next);
                          }}
                          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={loading || index === queue.length - 1}
                          onClick={() => {
                            const next = [...queue];
                            const tmp = next[index + 1];
                            next[index + 1] = next[index];
                            next[index] = tmp;
                            saveQueue(next);
                          }}
                          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            saveQueue(queue.filter((entry) => entry.id !== item.id))
                          }
                          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300 disabled:opacity-40"
                          aria-label="Remove from queue"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <input
                      value={item.question}
                      onChange={(e) => {
                        setQueueDraft((prev) =>
                          prev.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, question: e.target.value }
                              : entry,
                          ),
                        );
                      }}
                      onBlur={persistQueueDraft}
                      placeholder="Queued question"
                      className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={item.optionA}
                        onChange={(e) => {
                          setQueueDraft((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, optionA: e.target.value }
                                : entry,
                            ),
                          );
                        }}
                        onBlur={persistQueueDraft}
                        placeholder="Side A"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                      />
                      <input
                        value={item.optionB}
                        onChange={(e) => {
                          setQueueDraft((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, optionB: e.target.value }
                                : entry,
                            ),
                          );
                        }}
                        onBlur={persistQueueDraft}
                        placeholder="Side B"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              History ({history.length})
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Closed questions appear here after you start the next one or
                declare winners.
              </p>
            ) : (
              <ul className="space-y-3">
                {[...history].reverse().map((entry) => (
                  <li
                    key={entry.roundId}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm"
                  >
                    <p className="font-semibold text-white">
                      Q{entry.roundIndex}: {entry.question || "(blank)"}
                    </p>
                    <p className="mt-1 text-neutral-400">
                      Survived{" "}
                      {entry.survivingChoiceId === "a"
                        ? `A · ${entry.optionA}`
                        : entry.survivingChoiceId === "b"
                          ? `B · ${entry.optionB}`
                          : "—"}
                      {" · "}
                      A {entry.choiceACount} / B {entry.choiceBCount}
                      {" · "}
                      {entry.remainingCount} remaining
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
