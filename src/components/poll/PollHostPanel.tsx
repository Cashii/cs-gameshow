"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PollQuestionBank } from "@/components/poll/PollQuestionBank";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { uid } from "@/lib/utils";
import { mergePollBank } from "@/lib/poll/types";
import { useSuite } from "@/lib/suite-provider";

const HISTORY_PAGE_SIZE = 10;

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
  const { state, refreshSnapshot, updatePoll } = useSuite();
  const spectatorLive = state.spectatorGame === "poll";
  const poll = state.poll;
  const [question, setQuestion] = useState(poll.question || "");
  const [choices, setChoices] = useState(
    poll.choices.length >= 2
      ? poll.choices.map((c) => c.text)
      : ["Option A", "Option B"],
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null,
  );
  const [historyPage, setHistoryPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    pollId: string;
    question: string;
  }>({ open: false, pollId: "", question: "" });

  const runAction = async (body: Record<string, unknown>) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      await refreshSnapshot();
      setMessage("Done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const choicePayload = () =>
    choices.map((text, i) => ({
      id: String.fromCharCode(97 + i),
      text,
    }));

  const handleOpen = () => {
    void runAction({
      action: "open",
      question,
      choices: choicePayload(),
    });
  };

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

  const questionBank = (
    <PollQuestionBank
      questions={poll.library ?? []}
      canSave={
        Boolean(question.trim()) &&
        choices.filter((choice) => choice.trim()).length >= 2
      }
      onSave={() => {
        const texts = choices
          .map((choice) => choice.trim())
          .filter(Boolean)
          .slice(0, 6);
        if (!question.trim() || texts.length < 2) return;
        const liveTexts = poll.choices.map((choice) => choice.text);
        const sameChoices =
          liveTexts.length === choices.length &&
          liveTexts.every((text, index) => text === choices[index]);
        const correctIndex = sameChoices
          ? poll.choices.findIndex(
              (choice) => choice.id === poll.correctChoiceId,
            )
          : -1;
        updatePoll((prev) => ({
          ...prev,
          library: mergePollBank(prev.library ?? [], [
            {
              id: uid(),
              question,
              choices: texts.map((text) => ({ text })),
              correctChoiceIndex:
                correctIndex >= 0 && correctIndex < texts.length
                  ? correctIndex
                  : null,
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
        setQuestion(entry.question);
        setChoices(nextChoices.map((choice) => choice.text));
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
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Spectator actions
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={votingOpen}
              aria-label="Toggle voting"
              disabled={loading || (!votingOpen && !question.trim())}
              onClick={() => {
                if (votingOpen) void runAction({ action: "close" });
                else handleOpen();
              }}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                votingOpen ? "bg-emerald-500" : "bg-neutral-500"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  votingOpen ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-semibold ${
                votingOpen ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {votingOpen ? "Voting Live" : "Voting Closed"}
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => runAction({ action: "clear" })}
              className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              Clear poll
            </button>
            {poll.status !== "idle" && poll.correctChoiceId ? (
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void runAction({
                    action: poll.correctAnswerRevealed
                      ? "hideCorrectAnswer"
                      : "revealCorrectAnswer",
                  })
                }
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

      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Poll. Use the Spectator screen list so the
          projector shows the poll.
        </SpectatorScreenNotice>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <div className="space-y-8">
          <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Question
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
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
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={choice}
                    onChange={(e) => {
                      const next = [...choices];
                      next[i] = e.target.value;
                      setChoices(next);
                    }}
                    placeholder={`Choice ${i + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChoices(choices.filter((_, index) => index !== i))
                    }
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
                onClick={() =>
                  setChoices([...choices, `Option ${choices.length + 1}`])
                }
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

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Past polls ({history.length})
            </h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                Closed or replaced polls appear here so you can review answers later.
              </p>
            ) : (
              <>
              <ul className="mt-3 space-y-2">
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
                              {entryVotes} vote{entryVotes === 1 ? "" : "s"} ·{" "}
                              {entry.status}
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
                                    isCorrect ? "font-semibold text-emerald-300" : ""
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
                            <p className="text-sm text-neutral-500">No vote log saved.</p>
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
                                    <span className="text-neutral-500"> · </span>
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
        </div>

        <div className="space-y-4">
          {poll.status !== "idle" && (
            <div>
              <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Live tally
              </span>
              <p className="mt-1 text-sm text-neutral-400">
                Status:{" "}
                <span className="font-semibold text-white">{statusLabel}</span>
                {" "}
                — {totalVotes} vote{totalVotes === 1 ? "" : "s"}
              </p>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                {poll.choices.map((c) => {
                  const isCorrect = poll.correctChoiceId === c.id;
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
                        isCorrect
                          ? "bg-emerald-950/50 text-emerald-100"
                          : "text-neutral-300"
                      }`}
                    >
                      <span className="min-w-0 truncate">{c.text}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <strong className="w-8 text-right tabular-nums text-white">
                          {c.votes}
                        </strong>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            void runAction({
                              action: "setCorrectChoice",
                              choiceId: isCorrect ? null : c.id,
                            })
                          }
                          className={`inline-flex w-28 shrink-0 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap disabled:opacity-40 ${
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "border border-neutral-600 text-neutral-300 hover:bg-neutral-800"
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

          {poll.status !== "idle" && (
            <div>
              <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Vote log
              </span>
              {voteLog.length === 0 ? (
                <p className="mt-1.5 text-sm text-neutral-500">
                  No votes yet.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1 text-sm">
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
          )}
        </div>
      </div>

      </div>

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
    </div>
  );
}
