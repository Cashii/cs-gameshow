"use client";

import { useEffect, useRef, useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  createTriviaQueuedQuestion,
  MAX_TRIVIA_OPTIONS,
  mergeTriviaBank,
  MIN_TRIVIA_OPTIONS,
  normalizeTriviaCorrectChoice,
  optionTextForChoice,
  pauseTriviaTimer,
  resolveTriviaCorrectChoice,
  syncTriviaOptionsFields,
  triviaBankKey,
  triviaChoiceIdAt,
  triviaChoiceIndex,
  triviaChoiceLetter,
  triviaCorrectChoiceAfterRemoval,
  upsertTriviaBankEntry,
  type TriviaBankQuestion,
  type TriviaChoiceId,
  type TriviaQueuedQuestion,
  type TriviaStatus,
} from "@/lib/trivia/types";
import { TriviaQuestionBank } from "@/components/trivia/TriviaQuestionBank";
import { ResetButton } from "@/components/ui/ResetButton";
import { TriviaTimerPanel } from "@/components/trivia/TriviaTimerPanel";
import {
  OperatorNotice,
  SpectatorScreenNotice,
} from "@/components/operator/OperatorNotice";
import { uid } from "@/lib/utils";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { QueueMoveControls } from "@/components/ui/QueueMoveControls";

function triviaStatusLabel(
  status: TriviaStatus,
  questionNumber: number,
  settingUpNext: boolean,
  noWinners: boolean,
): string {
  switch (status) {
    case "open":
      return `Voting open · Q${questionNumber}`;
    case "locked":
      return `Locked · Q${questionNumber}`;
    case "revealed":
      return `Question ${questionNumber} closed`;
    case "finished":
      return noWinners ? "Game over" : "Winners";
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

function CorrectChoiceBadge() {
  return (
    <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-neutral-950 uppercase">
      Correct
    </span>
  );
}

export function TriviaHostPanel() {
  const { state, refreshSnapshot, setState, updateTrivia } = useSuite();
  const trivia = state.trivia;
  const spectatorLive = state.spectatorGame === "trivia";
  const [question, setQuestion] = useState(trivia.question || "");
  const [options, setOptions] = useState<string[]>(() =>
    trivia.options?.length
      ? trivia.options
      : [trivia.optionA || "True", trivia.optionB || "False"],
  );
  const [correctChoiceId, setCorrectChoiceId] = useState<TriviaChoiceId | null>(
    trivia.correctChoiceId ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [roster, setRoster] = useState<string[]>([]);
  const [queueDraft, setQueueDraft] = useState<TriviaQueuedQuestion[]>(
    () => trivia.queue ?? [],
  );
  const [bankOpenRequest, setBankOpenRequest] = useState(0);
  const draftRef = useRef({
    question,
    options,
    correctChoiceId: trivia.correctChoiceId ?? null,
  });
  const setupSeqRef = useRef(0);

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
  const replacingRound =
    trivia.status === "idle" && trivia.replacingRound === true;
  const questionClosed =
    trivia.status === "revealed" && trivia.remainingCount > 1;
  const nobodySurvived =
    trivia.status === "revealed" && trivia.remainingCount === 0;
  const gameEndedEmpty =
    trivia.status === "finished" && trivia.winnerCodes.length === 0;

  useEffect(() => {
    setQuestion(trivia.question || "");
    setOptions(
      trivia.options?.length
        ? trivia.options
        : [trivia.optionA || "True", trivia.optionB || "False"],
    );
    setCorrectChoiceId(trivia.correctChoiceId ?? null);
  }, [trivia.roundIndex, trivia.status]);

  const statusLabel = triviaStatusLabel(
    trivia.status,
    questionNumber,
    settingUpNext,
    gameEndedEmpty,
  );

  const answersLocked =
    trivia.status === "open" || trivia.status === "locked";
  const liveOptions =
    trivia.options?.length >= MIN_TRIVIA_OPTIONS
      ? trivia.options
      : options;
  const markedQuestion =
    trivia.status === "idle" ? question : trivia.question || question;
  const markedOptions = trivia.status === "idle" ? options : liveOptions;
  const markedCorrectId = resolveTriviaCorrectChoice(
    trivia.library ?? [],
    markedQuestion,
    markedOptions,
    trivia.status === "idle" ? correctChoiceId : trivia.correctChoiceId,
  );
  draftRef.current = {
    question,
    options,
    correctChoiceId: markedCorrectId,
  };

  const survive = (survivingChoiceId: TriviaChoiceId) => {
    void runAction({ action: "reveal", survivingChoiceId });
  };

  const addOption = () => {
    if (options.length >= MAX_TRIVIA_OPTIONS) return;
    setOptions((prev) => [...prev, `Answer ${prev.length + 1}`]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_TRIVIA_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectChoiceId((prev) => triviaCorrectChoiceAfterRemoval(prev, index));
  };

  const markCurrentAnswer = (choiceId: TriviaChoiceId) => {
    const next = markedCorrectId === choiceId ? null : choiceId;
    const questionText =
      trivia.status === "idle" ? question : trivia.question || question;
    const optionList = trivia.status === "idle" ? options : liveOptions;
    setCorrectChoiceId(next);
    draftRef.current = {
      question,
      options,
      correctChoiceId: next,
    };
    const key = triviaBankKey({ question: questionText, options: optionList });
    setState((prev) => ({
      ...prev,
      trivia: {
        ...prev.trivia,
        correctChoiceId: next,
        library: (prev.trivia.library ?? []).map((entry) =>
          triviaBankKey(entry) === key
            ? { ...entry, correctChoiceId: next }
            : entry,
        ),
      },
    }));
  };

  const updateQueuedOptions = (
    itemId: string,
    updater: (current: string[]) => string[],
  ) => {
    setQueueDraft((prev) =>
      prev.map((entry) => {
        if (entry.id !== itemId) return entry;
        const nextOptions = updater(
          entry.options?.length
            ? entry.options
            : [entry.optionA, entry.optionB],
        );
        return {
          ...entry,
          options: nextOptions,
          optionA: nextOptions[0] ?? entry.optionA,
          optionB: nextOptions[1] ?? entry.optionB,
        };
      }),
    );
  };

  const saveQueue = (
    queue: TriviaQueuedQuestion[],
    libraryEntry?: TriviaBankQuestion,
  ) => {
    setQueueDraft(queue);
    void runAction({
      action: "saveQueue",
      queue,
      ...(libraryEntry ? { libraryEntry } : {}),
    });
  };

  const persistQueueDraft = () => {
    setQueueDraft((current) => {
      void runAction({ action: "saveQueue", queue: current });
      return current;
    });
  };

  const persistQuestionDraft = () => {
    if (trivia.status !== "idle") return;
    const seq = ++setupSeqRef.current;
    const {
      question: draftQuestion,
      options: draftOptions,
      correctChoiceId: draftCorrectChoiceId,
    } = draftRef.current;
    void (async () => {
      setLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/trivia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setup",
            question: draftQuestion,
            options: draftOptions,
            correctChoiceId: draftCorrectChoiceId,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Action failed");
        // Ignore outdated draft saves so a slower earlier blur cannot wipe later edits.
        if (seq !== setupSeqRef.current) return;
        await refreshSnapshot();
      } catch (e) {
        if (seq === setupSeqRef.current) {
          setMessage(e instanceof Error ? e.message : "Failed");
        }
      } finally {
        if (seq === setupSeqRef.current) setLoading(false);
      }
    })();
  };

  const queue = queueDraft;
  const history = trivia.history ?? [];

  const toBankEntry = (
    entry: {
      question: string;
      options: string[];
      correctChoiceId?: TriviaChoiceId | null;
    },
    id = uid(),
  ): TriviaBankQuestion => {
    const synced = syncTriviaOptionsFields({ options: entry.options });
    return {
      id,
      question: entry.question.trim(),
      options: synced.options,
      optionA: synced.optionA,
      optionB: synced.optionB,
      correctChoiceId: normalizeTriviaCorrectChoice(
        entry.correctChoiceId,
        synced.options.length,
      ),
    };
  };

  const saveBankEntry = (entry: {
    question: string;
    options: string[];
    correctChoiceId?: TriviaChoiceId | null;
  }) => {
    const saved = toBankEntry(entry);
    setState((prev) => ({
      ...prev,
      trivia: {
        ...prev.trivia,
        library: mergeTriviaBank(prev.trivia.library ?? [], [saved]),
      },
    }));
  };

  const addBankEntryToUpcoming = (entry: {
    question: string;
    options: string[];
    correctChoiceId?: TriviaChoiceId | null;
    id?: string;
  }) => {
    const saved = toBankEntry(entry, entry.id);
    saveQueue(
      [...queue, createTriviaQueuedQuestion({ ...saved, id: uid() })],
      saved,
    );
  };

  const applyEntryToCurrent = (
    entry: {
      question: string;
      options: string[];
      correctChoiceId?: TriviaChoiceId | null;
      id?: string;
    },
    saveToBank = false,
  ) => {
    if (trivia.status !== "idle") return;
    const synced = syncTriviaOptionsFields({ options: entry.options });
    const nextQuestion = entry.question;
    const nextOptions = synced.options;
    const nextCorrect = normalizeTriviaCorrectChoice(
      entry.correctChoiceId,
      nextOptions.length,
    );
    setQuestion(nextQuestion);
    setOptions(nextOptions);
    setCorrectChoiceId(nextCorrect);
    const saved = saveToBank
      ? toBankEntry({ ...entry, correctChoiceId: nextCorrect }, entry.id)
      : null;
    draftRef.current = {
      question: nextQuestion,
      options: nextOptions,
      correctChoiceId: nextCorrect,
    };
    void runAction({
      action: "setup",
      question: nextQuestion,
      options: nextOptions,
      correctChoiceId: nextCorrect,
      ...(saved ? { libraryEntry: saved } : {}),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          {trivia.status !== "finished" && (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={trivia.status !== "idle"}
                aria-label="Put question on screen"
                disabled={
                  loading ||
                  trivia.status !== "idle" ||
                  !question.trim()
                }
                onPointerDown={(event) => {
                  // Keep focus in the question field so blur→setup does not race open.
                  if (event.button === 0) event.preventDefault();
                }}
                onClick={() => {
                  if (trivia.status !== "idle") return;
                  void runAction({
                    action: "open",
                    question,
                    options,
                    correctChoiceId: draftRef.current.correctChoiceId,
                  });
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                  trivia.status !== "idle"
                    ? "bg-emerald-500"
                    : "bg-neutral-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    trivia.status !== "idle"
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-semibold ${
                  trivia.status !== "idle"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {trivia.status !== "idle" ? "Live" : "Standby"}
              </span>
            </>
          )}
          <ResetButton
            disabled={loading}
            onClick={() => void runAction({ action: "resetSeries" })}
          >
            Reset Series
          </ResetButton>
          <div className="ml-auto">
            <TriviaQuestionBank
              questions={trivia.library ?? []}
              canSaveCurrent={Boolean(question.trim())}
              canSaveUpcoming={queue.some((item) => item.question.trim())}
              canLoadToCurrent={trivia.status === "idle"}
              onSaveCurrent={() =>
                saveBankEntry({
                  question,
                  options,
                  correctChoiceId: markedCorrectId,
                })
              }
              onSaveUpcoming={() => {
                const incoming = queue
                  .filter((item) => item.question.trim())
                  .map((item) =>
                    toBankEntry({
                      question: item.question,
                      options: item.options?.length
                        ? item.options
                        : [item.optionA, item.optionB],
                      correctChoiceId: resolveTriviaCorrectChoice(
                        trivia.library ?? [],
                        item.question,
                        item.options?.length
                          ? item.options
                          : [item.optionA, item.optionB],
                        item.correctChoiceId,
                      ),
                    }),
                  );
                setState((prev) => ({
                  ...prev,
                  trivia: {
                    ...prev.trivia,
                    library: mergeTriviaBank(
                      prev.trivia.library ?? [],
                      incoming,
                    ),
                  },
                }));
              }}
              onAdd={saveBankEntry}
              onAddToUpcoming={addBankEntryToUpcoming}
              openRequest={bankOpenRequest}
              onLoad={(id) => {
                const entry = (trivia.library ?? []).find(
                  (item) => item.id === id,
                );
                if (!entry) return;
                saveQueue([
                  ...queue,
                  createTriviaQueuedQuestion({
                    ...entry,
                    id: uid(),
                  }),
                ]);
              }}
              onLoadToCurrent={(id) => {
                const entry = (trivia.library ?? []).find(
                  (item) => item.id === id,
                );
                if (!entry) return;
                applyEntryToCurrent(entry);
              }}
              onUseAsCurrent={(entry) => applyEntryToCurrent(entry, true)}
              onUpdate={(id, entry) => {
                const saved = toBankEntry(entry, id);
                setState((prev) => ({
                  ...prev,
                  trivia: {
                    ...prev.trivia,
                    library: upsertTriviaBankEntry(
                      prev.trivia.library ?? [],
                      saved,
                    ),
                  },
                }));
              }}
              onDelete={(id) =>
                setState((prev) => ({
                  ...prev,
                  trivia: {
                    ...prev.trivia,
                    library: (prev.trivia.library ?? []).filter(
                      (item) => item.id !== id,
                    ),
                  },
                }))
              }
            />
          </div>
          {message ? (
            <p className="w-full text-sm text-neutral-400">{message}</p>
          ) : null}
        </div>
      </div>
      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Elimination Trivia. Use the Spectator screen list
          so the projector shows the question.
        </SpectatorScreenNotice>
      )}
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
      {!settingUpNext && !questionClosed && !replacingRound && !nobodySurvived ? (
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

      {replacingRound ? (
        <OperatorNotice
          className="mb-6"
          tone="info"
          title={`Question ${questionNumber} again`}
        >
          {trivia.roundIndex <= 1
            ? "The last question is cleared. Enter a different question, or use Load saved question, then open voting."
            : `${trivia.remainingCount} players are back in. Enter a different question, or use Load saved question, then open voting.`}
        </OperatorNotice>
      ) : null}
      {settingUpNext && !replacingRound ? (
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

      {nobodySurvived ? (
        <OperatorNotice
          className="mb-6"
          title={`Nobody survived question ${trivia.roundIndex}`}
        >
          Try this round again to put those players back in and ask a different
          question, or end the game with no winners. Undo reveal to keep this
          question and pick the other side.
        </OperatorNotice>
      ) : null}

      {gameEndedEmpty ? (
        <OperatorNotice className="mb-6" title="Game over">
          Nobody survived. Undo end if you want to try this round again.
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
          <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Question {questionNumber}
            </span>
            <button
              type="button"
              disabled={loading || trivia.status !== "idle"}
              onClick={() => setBankOpenRequest((current) => current + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
            >
              <FolderOpen size={14} />
              Load saved question
            </button>
          </div>
          <label className="block">
            <span className="sr-only">Question {questionNumber}</span>
            <input
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setCorrectChoiceId(null);
              }}
              onBlur={persistQuestionDraft}
              placeholder="True or false: …"
              autoFocus={settingUpNext || replacingRound}
              disabled={trivia.status === "open" || trivia.status === "locked"}
              className={`w-full rounded-lg border bg-neutral-800 px-3 py-2 text-sm text-white disabled:opacity-60 ${
                settingUpNext || replacingRound
                  ? "border-sky-400 ring-2 ring-sky-400/40"
                  : "border-neutral-700"
              }`}
            />
          </label>
          <div className="space-y-2">
            {options.map((option, index) => {
              const choiceId = triviaChoiceIdAt(index);
              const letter = triviaChoiceLetter(choiceId ?? "a");
              const isCorrect = choiceId != null && markedCorrectId === choiceId;
              return (
                <div key={`${index}-${letter}`}>
                  <span className="flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    <span className="flex items-center gap-2">
                      Answer {letter}
                      {isCorrect ? <CorrectChoiceBadge /> : null}
                    </span>
                    <span className="flex items-center gap-1">
                      {choiceId ? (
                        <button
                          type="button"
                          aria-pressed={isCorrect}
                          disabled={loading}
                          onClick={() => markCurrentAnswer(choiceId)}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase disabled:opacity-40 ${
                            isCorrect
                              ? "bg-emerald-500 text-neutral-950"
                              : "bg-neutral-900 text-neutral-400 hover:text-emerald-300"
                          }`}
                        >
                          {isCorrect ? "Correct" : "Mark correct"}
                        </button>
                      ) : null}
                      {options.length > MIN_TRIVIA_OPTIONS && !answersLocked ? (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                          aria-label={`Remove answer ${letter}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </span>
                  </span>
                  <input
                    value={option}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((item, i) =>
                          i === index ? e.target.value : item,
                        ),
                      )
                    }
                    onBlur={persistQuestionDraft}
                    disabled={answersLocked}
                    aria-label={`Answer ${letter}`}
                    className={`mt-1 w-full rounded-lg border bg-neutral-800 px-3 py-2 text-sm text-white disabled:opacity-60 ${
                      isCorrect ? "border-emerald-500" : "border-neutral-700"
                    }`}
                  />
                </div>
              );
            })}
            {options.length < MAX_TRIVIA_OPTIONS && !answersLocked ? (
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-600 px-3 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-800"
              >
                <Plus size={14} />
                Add answer
              </button>
            ) : null}
          </div>
          {trivia.status === "open" ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                updateTrivia((prev) =>
                  prev.timerRunning ? pauseTriviaTimer(prev) : prev,
                );
                void runAction({ action: "lock" });
              }}
              className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
            >
              Close voting
            </button>
          ) : null}
          </div>

          {(trivia.status !== "idle" || trivia.remainingCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {trivia.status === "locked" && (
              <>
                {markedCorrectId ? (
                  <p className="w-full rounded-lg border border-emerald-500/70 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200">
                    Correct answer: {triviaChoiceLetter(markedCorrectId)} —{" "}
                    {optionTextForChoice(liveOptions, markedCorrectId)}
                  </p>
                ) : null}
                {liveOptions.map((option, index) => {
                  const choiceId = triviaChoiceIdAt(index);
                  if (!choiceId) return null;
                  const isCorrect = markedCorrectId === choiceId;
                  return (
                    <button
                      key={choiceId}
                      type="button"
                      disabled={loading}
                      onClick={() => survive(choiceId)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
                        isCorrect
                          ? "bg-emerald-500 text-neutral-950 ring-2 ring-emerald-200 hover:bg-emerald-400"
                          : "bg-teal-700 text-white hover:bg-teal-600"
                      }`}
                    >
                      {isCorrect ? "Correct · " : ""}
                      Survive {triviaChoiceLetter(choiceId)} — {option}
                    </button>
                  );
                })}
              </>
            )}
            {nobodySurvived && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void runAction({ action: "retryRound" })}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
                >
                  Try this round again
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void runAction({ action: "endGame" })}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-40"
                >
                  End game
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
                {trivia.status === "finished"
                  ? gameEndedEmpty
                    ? "Undo end"
                    : "Undo winners"
                  : "Undo reveal"}
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
          </div>
          )}

          <section className="border-t border-neutral-800 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Upcoming questions ({queue.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setBankOpenRequest((current) => current + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
                >
                  <FolderOpen size={14} />
                  Load saved question
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    saveQueue([...queue, createTriviaQueuedQuestion()])
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                >
                  <Plus size={14} />
                  Add Question
                </button>
              </div>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Add a saved question, or stage one here. Starting the next
                question pulls the first item.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-neutral-500">
                  Use the arrows to reorder. Top question plays next.
                </p>
                {queue.map((item, index) => {
                  const queuedOptions = item.options?.length
                    ? item.options
                    : [item.optionA, item.optionB];
                  const queuedCorrectId = resolveTriviaCorrectChoice(
                    trivia.library ?? [],
                    item.question,
                    queuedOptions,
                    item.correctChoiceId,
                  );
                  return (
                  <article
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-800 p-3"
                  >
                    <QueueMoveControls
                      canMoveUp={index > 0}
                      canMoveDown={index < queue.length - 1}
                      disabled={loading}
                      label="question"
                      onMoveUp={() => {
                        const next = [...queue];
                        const tmp = next[index - 1];
                        next[index - 1] = next[index];
                        next[index] = tmp;
                        saveQueue(next);
                      }}
                      onMoveDown={() => {
                        const next = [...queue];
                        const tmp = next[index + 1];
                        next[index + 1] = next[index];
                        next[index] = tmp;
                        saveQueue(next);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-neutral-400">
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-neutral-500">
                            Queued #{index + 1}
                          </span>
                          {index === 0 ? (
                            <span className="text-xs font-semibold text-sky-400">
                              Plays next
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            saveQueue(queue.filter((entry) => entry.id !== item.id))
                          }
                          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-600 bg-neutral-900 text-neutral-300 hover:border-red-500 hover:text-red-300 disabled:opacity-40"
                          aria-label="Remove from queue"
                        >
                          <Trash2 size={22} />
                        </button>
                      </div>
                      <input
                        value={item.question}
                        onChange={(e) => {
                          setQueueDraft((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    question: e.target.value,
                                    correctChoiceId: null,
                                  }
                                : entry,
                            ),
                          );
                        }}
                        onBlur={persistQueueDraft}
                        placeholder="Queued question"
                        className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                      />
                      <div className="space-y-2">
                        {queuedOptions.map((option, optionIndex) => {
                          const choiceId = triviaChoiceIdAt(optionIndex);
                          const isCorrect =
                            choiceId != null && queuedCorrectId === choiceId;
                          return (
                          <div key={`${item.id}-${optionIndex}`} className="flex gap-2">
                            <div className="min-w-0 flex-1">
                              {isCorrect ? (
                                <p className="mb-1">
                                  <CorrectChoiceBadge />
                                </p>
                              ) : null}
                            <input
                              value={option}
                              onChange={(e) => {
                                updateQueuedOptions(item.id, (current) =>
                                  current.map((entry, i) =>
                                    i === optionIndex ? e.target.value : entry,
                                  ),
                                );
                              }}
                              onBlur={persistQueueDraft}
                              placeholder={`Answer ${triviaChoiceLetter(
                                choiceId ?? "a",
                              )}`}
                              className={`w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white ${
                                isCorrect
                                  ? "border-emerald-500"
                                  : "border-neutral-700"
                              }`}
                            />
                            </div>
                            {queuedOptions.length > MIN_TRIVIA_OPTIONS ? (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                  setQueueDraft((prev) =>
                                    prev.map((entry) => {
                                      if (entry.id !== item.id) return entry;
                                      const current = entry.options?.length
                                        ? entry.options
                                        : [entry.optionA, entry.optionB];
                                      const nextOptions = current.filter(
                                        (_, i) => i !== optionIndex,
                                      );
                                      return {
                                        ...entry,
                                        options: nextOptions,
                                        optionA: nextOptions[0] ?? entry.optionA,
                                        optionB: nextOptions[1] ?? entry.optionB,
                                        correctChoiceId:
                                          triviaCorrectChoiceAfterRemoval(
                                            entry.correctChoiceId,
                                            optionIndex,
                                          ),
                                      };
                                    }),
                                  );
                                  persistQueueDraft();
                                }}
                                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300 disabled:opacity-40"
                                aria-label="Remove queued answer"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                          );
                        })}
                        {queuedOptions.length < MAX_TRIVIA_OPTIONS ? (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              updateQueuedOptions(item.id, (current) => [
                                ...current,
                                `Answer ${current.length + 1}`,
                              ]);
                              persistQueueDraft();
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 disabled:opacity-40"
                          >
                            <Plus size={12} />
                            Add answer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <TriviaTimerPanel />
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
                {liveOptions.map((option, index) => (
                  <li
                    key={`live-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">
                      {triviaChoiceLetter(triviaChoiceIdAt(index) ?? "a")} ·{" "}
                      {option}
                    </span>
                    <strong className="tabular-nums">
                      {trivia.choiceCounts?.[index] ??
                        (index === 0
                          ? trivia.choiceACount
                          : index === 1
                            ? trivia.choiceBCount
                            : 0)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            {(trivia.status === "locked" ||
              trivia.status === "revealed" ||
              trivia.status === "finished") && (
              <ul className="mt-3 space-y-1 text-sm text-neutral-300">
                {liveOptions.map((option, index) => (
                  <li
                    key={`split-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">
                      {triviaChoiceLetter(triviaChoiceIdAt(index) ?? "a")} ·{" "}
                      {option}
                    </span>
                    <strong className="tabular-nums">
                      {trivia.choiceCounts?.[index] ??
                        (index === 0
                          ? trivia.choiceACount
                          : index === 1
                            ? trivia.choiceBCount
                            : 0)}
                    </strong>
                  </li>
                ))}
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
            {nobodySurvived ? (
              <p className="mt-3 text-sm text-amber-400">
                Nobody survived. Try this round again for a different question,
                end the game, or undo the reveal and pick the other side.
              </p>
            ) : null}
            {gameEndedEmpty ? (
              <p className="mt-3 text-sm text-amber-400">
                Game over. Nobody survived.
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
                      {entry.survivingChoiceId
                        ? `${triviaChoiceLetter(entry.survivingChoiceId)} · ${
                            (entry.options?.length
                              ? entry.options
                              : [entry.optionA, entry.optionB])[
                              triviaChoiceIndex(entry.survivingChoiceId)
                            ] ?? ""
                          }`
                        : "—"}
                      {" · "}
                      {(entry.options?.length
                        ? entry.options
                        : [entry.optionA, entry.optionB]
                      )
                        .map((option, index) => {
                          const count =
                            entry.choiceCounts?.[index] ??
                            (index === 0
                              ? entry.choiceACount
                              : index === 1
                                ? entry.choiceBCount
                                : 0);
                          return `${triviaChoiceLetter(
                            triviaChoiceIdAt(index) ?? "a",
                          )} ${count}`;
                        })
                        .join(" / ")}
                      {" · "}
                      {entry.remainingCount} remaining
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
    </div>
  );
}
