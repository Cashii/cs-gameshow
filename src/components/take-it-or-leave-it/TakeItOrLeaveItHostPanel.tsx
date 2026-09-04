"use client";

import { useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  MAX_TAKE_IT_CASES,
  MIN_TAKE_IT_CASES,
  createDefaultTakeItState,
  takeItCardLabel,
  takeItGridColumns,
  type TakeItCard,
} from "@/lib/take-it-or-leave-it/types";
import { countCards, countUnopened } from "@/lib/take-it-or-leave-it/logic";

export function TakeItOrLeaveItHostPanel() {
  const { state, updateTakeIt, refreshSnapshot } = useSuite();
  const game = state.takeIt ?? createDefaultTakeItState();
  const unopened = countUnopened(game);
  const columns = takeItGridColumns(game.cases.length || game.cards.length);
  const { green, red } = countCards(game.cards);
  const pickTotal = Object.values(game.pickCounts ?? {}).reduce(
    (sum, n) => sum + n,
    0,
  );
  const spectatorLive = state.spectatorGame === "takeIt";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const setCardAt = (index: number, card: TakeItCard) => {
    updateTakeIt((prev) => {
      if (prev.phase !== "setup") return prev;
      const cards = [...prev.cards];
      cards[index] = card;
      return { ...prev, cards };
    });
  };

  const addCase = (card: TakeItCard = "green") => {
    updateTakeIt((prev) => {
      if (prev.phase !== "setup" || prev.cards.length >= MAX_TAKE_IT_CASES) {
        return prev;
      }
      return { ...prev, cards: [...prev.cards, card] };
    });
  };

  const removeCase = (index: number) => {
    updateTakeIt((prev) => {
      if (prev.phase !== "setup" || prev.cards.length <= MIN_TAKE_IT_CASES) {
        return prev;
      }
      return {
        ...prev,
        cards: prev.cards.filter((_, i) => i !== index),
      };
    });
  };

  const runAction = async (action: "start" | "reset") => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/take-it", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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

  const beginOpening = () => {
    updateTakeIt((prev) => {
      if (prev.phase !== "pick") return prev;
      return { ...prev, phase: "playing" };
    });
  };

  const openCase = (caseId: number) => {
    updateTakeIt((prev) => {
      if (prev.phase !== "playing") return prev;
      const target = prev.cases.find((c) => c.id === caseId);
      if (!target || target.opened) return prev;
      return {
        ...prev,
        cases: prev.cases.map((c) =>
          c.id === caseId ? { ...c, opened: true } : c,
        ),
        lastOpenedCaseId: caseId,
      };
    });
  };

  const lastOpened = game.cases.find((c) => c.id === game.lastOpenedCaseId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Game Status</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Phase:{" "}
              <span className="font-semibold text-amber-300 capitalize">
                {game.phase}
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Deck:{" "}
              <span className="font-semibold text-emerald-400">{green} green</span>
              {" · "}
              <span className="font-semibold text-red-400">{red} red</span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Votes:{" "}
              <span className="font-semibold text-white">{pickTotal}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Last opened:{" "}
              <span className="font-semibold text-white">
                {lastOpened
                  ? `#${lastOpened.id} — ${takeItCardLabel(lastOpened.card)}`
                  : "—"}
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Cases left:{" "}
              <span className="font-semibold text-white">{unopened}</span>
            </p>
            {!spectatorLive ? (
              <p className="mt-2 text-sm text-amber-300">
                Put Take It or Leave It on the Spectator screen for the room
                display. Phones can still pick while this game is selected.
              </p>
            ) : null}
            {message ? (
              <p className="mt-2 text-sm text-red-300">{message}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAction("reset")}
            className="rounded-md border border-red-500 bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Reset Game
          </button>
        </div>
      </div>

      {game.phase === "setup" && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Cards in cases</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Green keeps players in. Red eliminates them. Case 1 keeps the
                first card you set, and so on. Set {MIN_TAKE_IT_CASES}–
                {MAX_TAKE_IT_CASES} cases. You can start with no phone picks yet.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={game.cards.length >= MAX_TAKE_IT_CASES}
                onClick={() => addCase("green")}
                className="rounded-md border border-emerald-500 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-40"
              >
                Add green
              </button>
              <button
                type="button"
                disabled={game.cards.length >= MAX_TAKE_IT_CASES}
                onClick={() => addCase("red")}
                className="rounded-md border border-red-500 bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
              >
                Add red
              </button>
            </div>
          </div>
          <div
            className="mb-6 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${takeItGridColumns(game.cards.length)}, minmax(0, 1fr))`,
            }}
          >
            {game.cards.map((card, index) => (
              <div
                key={index}
                className="rounded-lg border border-neutral-600 bg-neutral-900 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-500">
                    Case {index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={game.cards.length <= MIN_TAKE_IT_CASES}
                    onClick={() => removeCase(index)}
                    className="text-xs text-neutral-500 hover:text-red-300 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardAt(index, "green")}
                    className={`rounded-md px-2 py-2 text-sm font-semibold ${
                      card === "green"
                        ? "bg-emerald-500 text-neutral-950"
                        : "border border-neutral-600 text-neutral-300 hover:border-emerald-500"
                    }`}
                  >
                    Green
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardAt(index, "red")}
                    className={`rounded-md px-2 py-2 text-sm font-semibold ${
                      card === "red"
                        ? "bg-red-500 text-white"
                        : "border border-neutral-600 text-neutral-300 hover:border-red-500"
                    }`}
                  >
                    Red
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={loading || game.cards.length < MIN_TAKE_IT_CASES}
            onClick={() => void runAction("start")}
            className="rounded-md bg-amber-500 px-6 py-3 font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-40"
          >
            Start picking
          </button>
        </div>
      )}

      {game.phase === "pick" && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-white">Cases</h2>
          <div
            className="mb-4 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {game.cases.map((c) => {
              const votes = game.pickCounts?.[String(c.id)] ?? 0;
              const isGreen = c.card === "green";
              return (
                <div
                  key={c.id}
                  className={`rounded-md border px-2 py-2 text-center ${
                    isGreen
                      ? "border-emerald-500 bg-emerald-900/40"
                      : "border-red-500 bg-red-900/40"
                  }`}
                >
                  <p className="text-sm font-bold text-white">#{c.id}</p>
                  <p
                    className={`text-xs font-semibold ${
                      isGreen ? "text-emerald-200" : "text-red-200"
                    }`}
                  >
                    {takeItCardLabel(c.card)}
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-amber-300">
                    {votes}
                  </p>
                  <p className="text-[0.65rem] leading-tight text-neutral-400">
                    {votes === 1 ? "vote" : "votes"}
                  </p>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={beginOpening}
            className="rounded-md bg-amber-500 px-6 py-3 font-semibold text-neutral-950 hover:bg-amber-400"
          >
            Begin opening cases
          </button>
        </div>
      )}

      {game.phase === "playing" && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
          <h2 className="mb-2 text-3xl font-bold text-white">Open Cases</h2>
          <p className="mb-4 text-sm text-neutral-400">
            Answers and vote counts stay visible to you. Click a case to reveal
            it on the big screen and phones. Dimmed cases are already opened.
          </p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {game.cases.map((c) => {
              const votes = game.pickCounts?.[String(c.id)] ?? 0;
              const isGreen = c.card === "green";
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={c.opened}
                  onClick={() => openCase(c.id)}
                  className={`rounded-md border px-2 py-2 text-sm font-bold transition-colors ${
                    isGreen
                      ? "border-emerald-500 bg-emerald-900/40 text-emerald-200"
                      : "border-red-500 bg-red-900/40 text-red-200"
                  } ${
                    c.opened
                      ? "cursor-not-allowed opacity-45"
                      : votes > 0
                        ? "ring-2 ring-sky-400 ring-offset-1 ring-offset-neutral-800 hover:brightness-110"
                        : "hover:brightness-110"
                  }`}
                >
                  #{c.id}
                  <span className="mt-0.5 block text-xs font-semibold">
                    {takeItCardLabel(c.card)}
                  </span>
                  <span className="mt-1 block text-xl font-bold tabular-nums text-amber-300">
                    {votes}
                  </span>
                  <span className="mt-0.5 block text-[0.65rem] font-medium leading-tight text-neutral-300">
                    {c.opened
                      ? "Opened"
                      : votes > 0
                        ? `${votes} ${votes === 1 ? "vote" : "votes"} · tap`
                        : "No votes · tap"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
