"use client";

import { useState } from "react";
import { useSuite } from "@/lib/suite-provider";
import { createDefaultTakeItState } from "@/lib/take-it-or-leave-it/types";
import {
  countUnopenedNonPlayer,
  formatTakeItMoney,
  getPlayerCase,
  getSuggestedOffer,
  shuffleValuesIntoCases,
  shouldBeginFinalReveal,
} from "@/lib/take-it-or-leave-it/logic";

export function TakeItOrLeaveItHostPanel() {
  const { state, updateTakeIt } = useSuite();
  const game = state.takeIt ?? createDefaultTakeItState();
  const [offerInput, setOfferInput] = useState("");
  const suggested = getSuggestedOffer(game);
  const playerCase = getPlayerCase(game);
  const unopenedOthers = countUnopenedNonPlayer(game);

  const setValueAt = (index: number, raw: string) => {
    const parsed = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
    updateTakeIt((prev) => {
      if (prev.phase !== "setup") return prev;
      const values = [...prev.values];
      values[index] = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      return { ...prev, values };
    });
  };

  const startGame = (shuffle: boolean) => {
    updateTakeIt((prev) => {
      const cases = shuffle
        ? shuffleValuesIntoCases(prev.values)
        : prev.values.map((value, index) => ({
            id: index + 1,
            value,
            opened: false,
          }));

      return {
        ...prev,
        phase: "pick",
        cases,
        playerCaseId: null,
        offerAmount: null,
        lastOpenedCaseId: null,
        tookIt: null,
      };
    });
    setOfferInput("");
  };

  const pickPlayerCase = (caseId: number) => {
    updateTakeIt((prev) => {
      if (prev.phase !== "pick") return prev;
      return {
        ...prev,
        playerCaseId: caseId,
        phase: "playing",
      };
    });
  };

  const openCase = (caseId: number) => {
    updateTakeIt((prev) => {
      if (prev.phase !== "playing") return prev;
      if (caseId === prev.playerCaseId) return prev;
      const target = prev.cases.find((c) => c.id === caseId);
      if (!target || target.opened) return prev;

      const cases = prev.cases.map((c) =>
        c.id === caseId ? { ...c, opened: true } : c,
      );
      const next = {
        ...prev,
        cases,
        lastOpenedCaseId: caseId,
        offerAmount: null,
        tookIt: null,
      };

      if (shouldBeginFinalReveal(next)) {
        return {
          ...next,
          phase: "final" as const,
        };
      }
      return next;
    });
  };

  const showOffer = () => {
    const amount = Number.parseInt(offerInput.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(amount) || amount < 0) return;
    updateTakeIt((prev) => {
      if (prev.phase !== "playing" && prev.phase !== "offer") return prev;
      return {
        ...prev,
        phase: "offer",
        offerAmount: amount,
        tookIt: null,
      };
    });
  };

  const takeOffer = () => {
    updateTakeIt((prev) => {
      if (prev.phase !== "offer" || prev.offerAmount == null) return prev;
      return {
        ...prev,
        phase: "final",
        tookIt: true,
      };
    });
  };

  const leaveOffer = () => {
    updateTakeIt((prev) => {
      if (prev.phase !== "offer") return prev;
      return {
        ...prev,
        phase: "playing",
        tookIt: false,
      };
    });
  };

  const revealPlayerCase = () => {
    updateTakeIt((prev) => {
      if (prev.phase !== "final" || prev.playerCaseId == null) return prev;
      return {
        ...prev,
        phase: "revealed",
        lastOpenedCaseId: prev.playerCaseId,
        cases: prev.cases.map((c) =>
          c.id === prev.playerCaseId ? { ...c, opened: true } : c,
        ),
      };
    });
  };

  const resetGame = () => {
    updateTakeIt((prev) => ({
      ...createDefaultTakeItState(),
      values: [...prev.values],
    }));
    setOfferInput("");
  };

  const lastOpened = game.cases.find((c) => c.id === game.lastOpenedCaseId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="rounded-lg border border-neutral-700 bg-white p-6 shadow-lg">
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
              Player case:{" "}
              <span className="font-semibold text-white">
                {game.playerCaseId ?? "—"}
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Last opened:{" "}
              <span className="font-semibold text-white">
                {lastOpened
                  ? `#${lastOpened.id} — ${formatTakeItMoney(lastOpened.value)}`
                  : "—"}
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Cases left to open:{" "}
              <span className="font-semibold text-white">{unopenedOthers}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-md border border-red-500 bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            Reset Game
          </button>
        </div>
      </div>

      {game.phase === "setup" && (
        <div className="rounded-lg border border-neutral-700 bg-white p-6 shadow-lg">
          <h2 className="mb-2 text-xl font-bold text-white">Prize Amounts</h2>
          <p className="mb-4 text-sm text-neutral-400">
            Edit the nine prize amounts. Without shuffling, each amount stays
            assigned to its matching case number.
          </p>
          <div className="mb-6 grid grid-cols-3 gap-3">
            {game.values.map((value, index) => (
              <label key={index} className="block">
                <span className="mb-1 block text-xs text-neutral-500">
                  Case {index + 1}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValueAt(index, e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-center font-semibold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => startGame(true)}
              className="rounded-md bg-amber-500 px-6 py-3 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              Shuffle &amp; Start
            </button>
            <button
              type="button"
              onClick={() => startGame(false)}
              className="rounded-md border border-teal-500 bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-500"
            >
              Start Without Shuffle
            </button>
          </div>
        </div>
      )}

      {game.phase === "pick" && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
          <h2 className="mb-2 text-xl font-bold text-white">
            Pick Player Case
          </h2>
          <p className="mb-4 text-sm text-neutral-400">
            Contestant chooses one case to keep.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {game.cases.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickPlayerCase(c.id)}
                className="rounded-lg border border-amber-500/40 bg-neutral-900 py-6 text-2xl font-bold text-amber-300 hover:bg-amber-500 hover:text-neutral-950"
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {(game.phase === "playing" ||
        game.phase === "offer" ||
        game.phase === "final" ||
        game.phase === "revealed") && (
        <>
          <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
            <h2 className="mb-2 text-3xl font-bold text-white">Open Cases</h2>
            <p className="mb-4 text-sm text-neutral-400">
              Click a case to open it on the audience board.
              {game.playerCaseId != null &&
                ` Player case #${game.playerCaseId} is locked.`}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {game.cases.map((c) => {
                const isPlayer = c.id === game.playerCaseId;
                const disabled =
                  game.phase !== "playing" || c.opened || isPlayer;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => openCase(c.id)}
                    className={`rounded-lg border py-5 text-lg font-bold transition-colors ${
                      isPlayer
                        ? "border-sky-400 bg-sky-900/40 text-sky-200"
                        : c.opened
                          ? "border-neutral-700 bg-neutral-900 text-neutral-500 line-through"
                          : "border-amber-500/40 bg-neutral-900 text-amber-300 hover:bg-amber-500 hover:text-neutral-950"
                    } ${disabled && !isPlayer ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {c.id}
                    {c.opened && (
                      <span className="mt-1 block text-lg font-semibold">
                        {formatTakeItMoney(c.value)}
                      </span>
                    )}
                    {isPlayer && (
                      <span className="mt-1 block text-xs font-medium">
                        YOURS
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {game.phase === "final" && (
              <button
                type="button"
                onClick={revealPlayerCase}
                className="mt-4 rounded-md bg-amber-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-amber-400"
              >
                Reveal Final Case
              </button>
            )}
          </div>

          {(game.phase === "playing" || game.phase === "offer") && (
            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
              <h2 className="mb-2 text-xl font-bold text-white">
                Banker Offer
              </h2>
              <p className="mb-4 text-sm text-neutral-400">
                Type the offer to show on the audience screen.
              </p>
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="block min-w-[200px] flex-1">
                  <span className="mb-1 block text-sm text-neutral-400">
                    Offer amount
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") showOffer();
                    }}
                    placeholder="e.g. 250"
                    className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-4 py-3 text-xl font-semibold text-white placeholder-neutral-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setOfferInput(String(suggested))}
                  aria-label={`Use suggested offer ${formatTakeItMoney(suggested)}`}
                  className="inline-flex h-[54px] items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 text-left transition-colors hover:border-amber-400/60 hover:bg-amber-500/20"
                >
                  <span className="text-xs tracking-wide text-amber-200/80 uppercase">
                    Suggested tip
                  </span>
                  <span className="text-lg font-bold text-amber-300">
                    {formatTakeItMoney(suggested)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={showOffer}
                  disabled={!offerInput.trim()}
                  className={`h-[54px] rounded-md px-5 font-semibold ${
                    offerInput.trim()
                      ? "bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                  }`}
                >
                  Show Offer
                </button>
              </div>

              {game.phase === "offer" && game.offerAmount != null && (
                <div className="flex flex-wrap items-center gap-3 border-t border-neutral-700 pt-4">
                  <p className="mr-auto text-lg font-semibold text-white">
                    Showing: {formatTakeItMoney(game.offerAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={takeOffer}
                    className="rounded-md bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500"
                  >
                    Take It
                  </button>
                  <button
                    type="button"
                    onClick={leaveOffer}
                    className="rounded-md bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-500"
                  >
                    Leave It
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {game.phase === "revealed" && (
        <div className="rounded-lg border border-amber-500/40 bg-neutral-800 p-6 shadow-lg">
          <h2 className="mb-2 text-xl font-bold text-white">Final Result</h2>
          {game.tookIt && game.offerAmount != null ? (
            <p className="text-neutral-300">
              Contestant took the offer for{" "}
              <span className="font-bold text-emerald-400">
                {formatTakeItMoney(game.offerAmount)}
              </span>
              . Player case held{" "}
              <span className="font-bold text-amber-300">
                {playerCase ? formatTakeItMoney(playerCase.value) : "—"}
              </span>
              .
            </p>
          ) : (
            <p className="text-neutral-300">
              Contestant won{" "}
              <span className="font-bold text-amber-300">
                {playerCase ? formatTakeItMoney(playerCase.value) : "—"}
              </span>{" "}
              from case #{game.playerCaseId}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
