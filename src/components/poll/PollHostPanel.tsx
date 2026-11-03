"use client";

import { Lock, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PollQuestionBank } from "@/components/poll/PollQuestionBank";
import { PollTimerPanel } from "@/components/poll/PollTimerPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { JoinQrToggleButton } from "@/components/ui/JoinQrToggleButton";
import { ResetButton } from "@/components/ui/ResetButton";
import { Toast, useToast } from "@/components/ui/Toast";
import { uid } from "@/lib/utils";
import {
  mergePollBank,
  nextPollChoiceId,
  type PollChoice,
  type PollState,
} from "@/lib/poll/types";
import type { EventSnapshot } from "@/lib/suite-state";
import { useSuite } from "@/lib/suite-provider";

const HISTORY_PAGE_SIZE = 10;

type ChoiceDraft = { id: string; text: string };

function defaultChoiceDrafts(): ChoiceDraft[] {
  return [
    { id: "a", text: "Option A" },
    { id: "b", text: "Option B" },
  ];
}

function choiceDraftsFromPoll(poll: PollState): ChoiceDraft[] {
  return poll.choices.length >= 2
    ? poll.choices.map((choice) => ({ id: choice.id, text: choice.text }))
    : defaultChoiceDrafts();
}

function withLiveVotes(
  drafts: ChoiceDraft[],
  live: PollChoice[],
): PollChoice[] {
  const source = drafts.length >= 2 ? drafts : defaultChoiceDrafts();
  return source.map((draft) => ({
    id: draft.id,
    text: draft.text,
    votes: live.find((choice) => choice.id === draft.id)?.votes ?? 0,
  }));
}

function formatVoteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function PollHostPanel() {
  const { state, refreshSnapshot, applyServerSnapshot, updatePoll } = useSuite();
  const { toastMessage, toastTone, showToast } = useToast();
  const poll = state.poll;
  const [questionDraft, setQuestionDraft] = useState(poll.question || "");
  const [choicesDraft, setChoicesDraft] = useState(() =>
    choiceDraftsFromPoll(poll),
  );
  const draftRef = useRef({
    question: questionDraft,
    choices: choicesDraft,
  });
  draftRef.current = { question: questionDraft, choices: choicesDraft };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null,
  );
  const [historyPage, setHistoryPage] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    pollId: string;
    question: string;
  }>({ open: false, pollId: "", question: "" });

  useEffect(() => {
    setQuestionDraft(poll.question || "");
    setChoicesDraft(choiceDraftsFromPoll(poll));
  }, [poll.id]);

  const persistDraft = () => {
    const { question, choices } = draftRef.current;
    updatePoll((prev) => {
      const nextChoices = withLiveVotes(choices, prev.choices);
      const sameQuestion = prev.question === question;
      const sameChoices =
        prev.choices.length === nextChoices.length &&
        prev.choices.every(
          (choice, index) =>
            choice.id === nextChoices[index]?.id &&
            choice.text === nextChoices[index]?.text,
        );
      if (sameQuestion && sameChoices) return prev;
      return { ...prev, question, choices: nextChoices };
    });
  };

  const runAction = async (body: Record<string, unknown>) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as EventSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      // Prefer the API snapshot so Open Voting isn't lost to a stale merge/fetch.
      if (typeof data.revision === "number" && data.poll) {
        applyServerSnapshot(data);
      } else {
        await refreshSnapshot();
      }
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const { question, choices } = draftRef.current;
    persistDraft();
    void runAction({
      action: "open",
      question,
      choices: withLiveVotes(choices, poll.choices).map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
    });
  };

  const setQuestion = (value: string) => {
    setQuestionDraft(value);
  };

  const setChoiceText = (index: number, text: string) => {
    setChoicesDraft((prev) =>
      prev.map((choice, i) => (i === index ? { ...choice, text } : choice)),
    );
  };

  const removeChoice = (index: number) => {
    const prevDrafts = draftRef.current.choices;
    if (prevDrafts.length <= 2) return;
    const removedId = prevDrafts[index]?.id;
    const nextDrafts = prevDrafts.filter((_, i) => i !== index);
    setChoicesDraft(nextDrafts);
    draftRef.current = { ...draftRef.current, choices: nextDrafts };
    updatePoll((prev) => {
      const nextChoices = withLiveVotes(nextDrafts, prev.choices);
      return {
        ...prev,
        question: draftRef.current.question,
        choices: nextChoices,
        correctChoiceId:
          prev.correctChoiceId && prev.correctChoiceId === removedId
            ? null
            : prev.correctChoiceId,
        correctAnswerRevealed:
          prev.correctChoiceId && prev.correctChoiceId === removedId
            ? false
            : prev.correctAnswerRevealed,
      };
    });
  };

  const addChoice = () => {
    const prevDrafts = draftRef.current.choices;
    if (prevDrafts.length >= 6) return;
    const nextDrafts = [
      ...prevDrafts,
      { id: nextPollChoiceId(prevDrafts), text: "" },
    ];
    setChoicesDraft(nextDrafts);
    draftRef.current = { ...draftRef.current, choices: nextDrafts };
    persistDraft();
  };

  const question = questionDraft;
  const choices = withLiveVotes(choicesDraft, poll.choices);
  const totalVotes = poll.choices.reduce((s, c) => s + c.votes, 0);
  const statusLabel =
    poll.status === "open"
      ? "Live"
      : poll.status === "results"
        ? "Results"
        : poll.status === "closed"
          ? "Closed"
          : "Idle";

  const votingOpen = poll.status === "open";
  const voteLog = poll.voteLog ?? [];
  const history = state.pollHistory ?? [];
  const historyPageCount = Math.max(
    1,
    Math.ceil(history.length / HISTORY_PAGE_SIZE),
  );
  if (historyPage > historyPageCount - 1) {
    setHistoryPage(historyPageCount - 1);
  }
  const historyPageIndex = Math.min(historyPage, historyPageCount - 1);
  const visibleHistory = history.slice(
    historyPageIndex * HISTORY_PAGE_SIZE,
    historyPageIndex * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE,
  );

  const handleClearHistory = () => {
    const count = history.length;
    if (count === 0) return;
    setExpandedHistoryId(null);
    setHistoryPage(0);
    void (async () => {
      const ok = await runAction({ action: "clearHistory" });
      if (!ok) return;
      setMessage("");
      showToast(
        `Cleared ${count} past poll${count === 1 ? "" : "s"} from history`,
      );
    })();
  };

  const questionBank = (
    <PollQuestionBank
      questions={poll.library ?? []}
      groups={poll.groups ?? []}
      canSave={
        Boolean(question.trim()) &&
        choices.filter((choice) => choice.text.trim()).length >= 2
      }
      onSave={(groupId) => {
        persistDraft();
        const texts = choices
          .map((choice) => choice.text.trim())
          .filter(Boolean)
          .slice(0, 6);
        if (!question.trim() || texts.length < 2) return;
        const correctIndex = choices.findIndex(
          (choice) => choice.id === poll.correctChoiceId,
        );
        updatePoll((prev) => ({
          ...prev,
          question: draftRef.current.question,
          choices: withLiveVotes(draftRef.current.choices, prev.choices),
          library: mergePollBank(prev.library ?? [], [
            {
              id: uid(),
              question: draftRef.current.question,
              choices: texts.map((text) => ({ text })),
              correctChoiceIndex:
                correctIndex >= 0 && correctIndex < texts.length
                  ? correctIndex
                  : null,
              groupId,
            },
          ]),
        }));
      }}
      onLoad={(id) => {
        const entry = (poll.library ?? []).find((item) => item.id === id);
        if (!entry) return;
        const nextChoices = entry.choices.map((choice, index) => ({
          id: String.fromCharCode(97 + index),
          text: choice.text,
          votes: 0,
        }));
        setQuestionDraft(entry.question);
        setChoicesDraft(
          nextChoices.map((choice) => ({ id: choice.id, text: choice.text })),
        );
        updatePoll((prev) => ({
          ...prev,
          id: uid(),
          question: entry.question,
          choices: nextChoices,
          status: "idle",
          voteLog: [],
          correctChoiceId:
            entry.correctChoiceIndex == null
              ? null
              : (nextChoices[entry.correctChoiceIndex]?.id ?? null),
          correctAnswerRevealed: false,
        }));
      }}
      onDelete={(id) =>
        updatePoll((prev) => ({
          ...prev,
          library: (prev.library ?? []).filter((item) => item.id !== id),
        }))
      }
      onGroupsApply={(next) =>
        updatePoll((prev) => ({
          ...prev,
          groups: next.groups,
          library: next.items,
        }))
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Game actions
            </span>
            {votingOpen ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction({ action: "close" })}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-orange-500 bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-40"
              >
                <Lock size={16} />
                Close Voting
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !question.trim()}
                onClick={handleOpen}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-500 bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                <Play size={16} />
                Open Voting
              </button>
            )}
            <ResetButton
              disabled={loading}
              onClick={() => setConfirmReset(true)}
            >
              Reset poll
            </ResetButton>
            {poll.status === "idle" ? (
              <JoinQrToggleButton
                disabled={loading}
                active={Boolean(poll.showJoinQr)}
                onClick={() =>
                  updatePoll((prev) => ({
                    ...prev,
                    showJoinQr: !prev.showJoinQr,
                  }))
                }
              />
            ) : null}
            {poll.status !== "idle" && poll.correctChoiceId ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const reveal = !poll.correctAnswerRevealed;
                  updatePoll((prev) => ({
                    ...prev,
                    correctAnswerRevealed: reveal,
                  }));
                  void runAction({
                    action: reveal
                      ? "revealCorrectAnswer"
                      : "hideCorrectAnswer",
                  });
                }}
                className="inline-flex h-10 items-center rounded-md border border-amber-500 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {poll.correctAnswerRevealed
                  ? "Hide correct answer"
                  : "Reveal correct answer"}
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={poll.showPercentages !== false}
              aria-label="Toggle live percentages"
              disabled={loading}
              onClick={() =>
                void runAction({
                  action: "setShowPercentages",
                  showPercentages: poll.showPercentages === false,
                })
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                poll.showPercentages !== false ? "bg-sky-500" : "bg-neutral-500"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  poll.showPercentages !== false
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-semibold ${
                poll.showPercentages !== false
                  ? "text-sky-300"
                  : "text-neutral-400"
              }`}
            >
              {poll.showPercentages !== false
                ? "Percentages shown"
                : "Percentages hidden"}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6 lg:overflow-hidden">
        <div className="grid items-start gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:overflow-hidden">
          <div className="space-y-8 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Question
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onBlur={persistDraft}
                    placeholder="What should we ask?"
                    aria-label="Question"
                    className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white"
                  />
                  {questionBank}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Choices
                </span>
                <div className="mt-1.5 space-y-2">
                  {choices.map((choice, i) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <input
                        value={choice.text}
                        onChange={(e) => setChoiceText(i, e.target.value)}
                        onBlur={persistDraft}
                        placeholder={`Choice ${i + 1}`}
                        className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeChoice(i)}
                        disabled={choices.length <= 2}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Remove choice ${i + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addChoice}
                    disabled={choices.length >= 6}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                  >
                    <Plus size={16} />
                    Add choice
                  </button>
                </div>
              </div>
            </div>

            {message && (
              <p className="text-sm text-neutral-400">{message}</p>
            )}

            {poll.status !== "idle" && (
              <div className="shrink-0">
                <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Live tally
                </span>
                <p className="mt-1 text-sm text-neutral-400">
                  Status:{" "}
                  <span className="font-semibold text-white">{statusLabel}</span> —{" "}
                  {totalVotes} vote{totalVotes === 1 ? "" : "s"}
                </p>
                {(poll.status === "closed" || poll.status === "results") &&
                !poll.correctChoiceId ? (
                  <p className="mt-2 rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-200">
                    Choose the correct answer — tap{" "}
                    <span className="text-amber-100">Mark correct</span> on the
                    winning choice below, then reveal it for players.
                  </p>
                ) : null}
                <ul className="mt-2 space-y-2">
                  {choices.map((c) => {
                    const isCorrect = poll.correctChoiceId === c.id;
                    return (
                      <li
                        key={c.id}
                        className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-base ${
                          isCorrect
                            ? "border-emerald-500/60 bg-emerald-950/50 text-emerald-100"
                            : "border-neutral-700 bg-neutral-900/80 text-neutral-200"
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium">
                          {c.text}
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          <strong className="w-10 text-right text-lg tabular-nums text-white">
                            {c.votes}
                          </strong>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              const choiceId = isCorrect ? null : c.id;
                              updatePoll((prev) => ({
                                ...prev,
                                correctChoiceId: choiceId,
                                correctAnswerRevealed: choiceId
                                  ? prev.correctAnswerRevealed
                                  : false,
                              }));
                              void runAction({
                                action: "setCorrectChoice",
                                choiceId,
                              });
                            }}
                            className={`inline-flex h-10 min-w-32 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap disabled:opacity-40 ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : "border border-neutral-600 text-neutral-200 hover:bg-neutral-800"
                            }`}
                          >
                            {isCorrect ? "Correct" : "Mark correct"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </div>

          <aside className="flex min-h-0 flex-col gap-4 lg:h-full lg:overflow-hidden">
            <PollTimerPanel />
            {poll.status !== "idle" ? (
              <div className="flex shrink-0 flex-col">
                <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Vote log
                </span>
                {voteLog.length === 0 ? (
                  <p className="mt-1.5 text-sm text-neutral-500">No votes yet.</p>
                ) : (
                  <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-sm lg:max-h-64">
                    {voteLog.map((entry) => (
                      <li
                        key={entry.id}
                        className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-2 text-neutral-400"
                      >
                        <span className="tabular-nums text-neutral-500">
                          {formatVoteTime(entry.at)}
                        </span>
                        <span className="min-w-0 truncate">
                          <span className="font-medium text-neutral-200">
                            {entry.deviceCode || entry.voterLabel}
                          </span>
                          <span className="text-neutral-500"> · </span>
                          <span>{entry.choiceText}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-baseline justify-between gap-3">
                <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Past polls ({history.length})
                </h3>
                <button
                  type="button"
                  disabled={loading || history.length === 0}
                  onClick={handleClearHistory}
                  className="shrink-0 text-sm font-semibold text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear history
                </button>
              </div>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">
                  Closed or replaced polls appear here so you can review answers
                  later.
                </p>
              ) : (
                <>
                  <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto lg:pr-1">
                    {visibleHistory.map((entry) => {
                      const open = expandedHistoryId === entry.id;
                      const entryVotes = entry.choices.reduce(
                        (sum, choice) => sum + choice.votes,
                        0,
                      );
                      return (
                        <li
                          key={`${entry.id}-${entry.closedAt}`}
                          className="rounded-xl border border-neutral-800 bg-neutral-900"
                        >
                          <div className="flex items-center gap-1 px-2 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedHistoryId(open ? null : entry.id)
                              }
                              className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-2 text-left"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">
                                  {entry.question || "(no question)"}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {new Date(entry.closedAt).toLocaleString()} ·{" "}
                                  {entryVotes} vote
                                  {entryVotes === 1 ? "" : "s"} · {entry.status}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm text-neutral-400 underline underline-offset-2">
                                {open ? "Hide" : "Review"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() =>
                                setDeleteConfirm({
                                  open: true,
                                  pollId: entry.id,
                                  question: entry.question || "(no question)",
                                })
                              }
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-40"
                              aria-label={`Delete past poll: ${entry.question || "untitled"}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {open ? (
                            <div className="max-h-96 space-y-3 overflow-y-auto border-t border-neutral-800 px-4 py-3">
                              <ul className="space-y-1 text-sm text-neutral-300">
                                {entry.choices.map((choice) => {
                                  const isCorrect =
                                    entry.correctChoiceId === choice.id;
                                  return (
                                    <li
                                      key={choice.id}
                                      className={`flex justify-between gap-3 ${
                                        isCorrect
                                          ? "font-semibold text-emerald-300"
                                          : ""
                                      }`}
                                    >
                                      <span className="truncate">
                                        {choice.text}
                                        {isCorrect ? " ✓" : ""}
                                      </span>
                                      <strong className="tabular-nums text-white">
                                        {choice.votes}
                                      </strong>
                                    </li>
                                  );
                                })}
                              </ul>
                              {entry.voteLog.length === 0 ? (
                                <p className="text-sm text-neutral-500">
                                  No vote log saved.
                                </p>
                              ) : (
                                <ul className="space-y-1 text-sm">
                                  {entry.voteLog.map((log) => (
                                    <li
                                      key={log.id}
                                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-2 text-neutral-400"
                                    >
                                      <span className="tabular-nums text-neutral-500">
                                        {formatVoteTime(log.at)}
                                      </span>
                                      <span className="min-w-0 truncate">
                                        <span className="font-medium text-neutral-200">
                                          {log.deviceCode || log.voterLabel}
                                        </span>
                                        <span className="text-neutral-500">
                                          {" "}
                                          ·{" "}
                                        </span>
                                        <span>{log.choiceText}</span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {history.length > HISTORY_PAGE_SIZE ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={historyPageIndex === 0}
                        onClick={() => setHistoryPage(historyPageIndex - 1)}
                        className="rounded-md border border-neutral-600 px-3 py-1.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <p className="text-sm text-neutral-400">
                        {historyPageIndex * HISTORY_PAGE_SIZE + 1}–
                        {Math.min(
                          history.length,
                          (historyPageIndex + 1) * HISTORY_PAGE_SIZE,
                        )}{" "}
                        of {history.length}
                      </p>
                      <button
                        type="button"
                        disabled={historyPageIndex >= historyPageCount - 1}
                        onClick={() => setHistoryPage(historyPageIndex + 1)}
                        className="rounded-md border border-neutral-600 px-3 py-1.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset poll?"
        message="This clears the current question, answers, and votes. The poll is saved to Past polls if it had votes."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          void runAction({ action: "clear" });
        }}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, open }))
        }
        title="Delete past poll"
        message={`Remove “${deleteConfirm.question}” from history? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          const pollId = deleteConfirm.pollId;
          if (expandedHistoryId === pollId) setExpandedHistoryId(null);
          void runAction({ action: "deleteHistory", pollId });
        }}
      />

      <Toast message={toastMessage} tone={toastTone} />
    </div>
  );
}
