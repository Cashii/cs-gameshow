"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSuite } from "@/lib/suite-provider";

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
  const { state, refreshSnapshot } = useSuite();
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
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
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Poll Control</h3>
          <p className="text-sm text-neutral-400">
            Edit the question, then open voting. Set Spectator screen to Poll to put
            live results on the projector.
          </p>
        </div>
        <p className="text-sm text-neutral-400">
          Status:{" "}
          <span className="font-semibold text-white">{statusLabel}</span>
          {poll.status !== "idle" && (
            <>
              {" "}
              — {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            </>
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Question
            </span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we ask?"
              className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white"
            />
          </label>

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

        <div className="space-y-4">
          {poll.status !== "idle" && (
            <div>
              <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Live tally
              </span>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                {poll.choices.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 text-neutral-300"
                  >
                    <span className="truncate">{c.text}</span>
                    <strong className="tabular-nums text-white">{c.votes}</strong>
                  </li>
                ))}
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
                <ul className="mt-1.5 max-h-80 space-y-1 overflow-auto text-sm">
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

      {message && <p className="mt-3 text-sm text-neutral-400">{message}</p>}

      <section className="mt-8">
        <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          Past polls ({history.length})
        </h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Closed or replaced polls appear here so you can review answers later.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((entry) => {
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
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedHistoryId(open ? null : entry.id)
                    }
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
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
                    <span className="shrink-0 text-sm text-neutral-400">
                      {open ? "Hide" : "Review"}
                    </span>
                  </button>
                  {open ? (
                    <div className="space-y-3 border-t border-neutral-800 px-4 py-3">
                      <ul className="space-y-1 text-sm text-neutral-300">
                        {entry.choices.map((choice) => (
                          <li
                            key={choice.id}
                            className="flex justify-between gap-3"
                          >
                            <span className="truncate">{choice.text}</span>
                            <strong className="tabular-nums text-white">
                              {choice.votes}
                            </strong>
                          </li>
                        ))}
                      </ul>
                      {entry.voteLog.length === 0 ? (
                        <p className="text-sm text-neutral-500">No vote log saved.</p>
                      ) : (
                        <ul className="max-h-48 space-y-1 overflow-auto text-sm">
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
        )}
      </section>
      </div>
    </div>
  );
}
