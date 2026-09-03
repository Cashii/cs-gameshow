"use client";

import {
  createDefaultTakeItState,
  takeItCardLabel,
  takeItGridColumns,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";
import type { TakeItMe } from "@/lib/take-it-or-leave-it/picks";

export function PlayerTakeItPanel({
  game,
  playerCode,
  me,
  checking,
  loading,
  message,
  onPick,
}: Readonly<{
  game: TakeItGameState;
  playerCode: string;
  me: TakeItMe | null;
  checking: boolean;
  loading: boolean;
  message: string;
  onPick: (caseId: number) => void;
}>) {
  const takeIt = game ?? createDefaultTakeItState();
  const columns = takeItGridColumns(takeIt.cases.length || 9);
  const pickedId = me?.caseId ?? null;
  const canPick = takeIt.phase === "pick" && pickedId == null;

  if (me?.result === "continue" || me?.result === "eliminated") {
    const win = me.result === "continue";
    return (
      <div
        className={`flex h-full flex-col items-center justify-center px-6 text-center ${
          win ? "bg-emerald-950" : "bg-red-950"
        }`}
      >
        <p className="text-xs font-semibold tracking-wide uppercase text-white/60">
          Case #{me.caseId}
        </p>
        <h1
          className={`mt-3 text-4xl font-bold ${
            win ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {win ? "Keep playing" : "Eliminated"}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-white/70">
          {win
            ? "You drew a green card. Stay in the game."
            : "You drew a red card. You’re out this round."}
        </p>
        {playerCode ? (
          <p className="mt-6 text-sm tracking-widest text-white/40">
            {playerCode}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-neutral-950 px-4 py-6 text-white">
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Take It or Leave It
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {takeIt.phase === "pick"
            ? pickedId
              ? `You picked case #${pickedId}`
              : "Pick a case"
            : takeIt.phase === "playing"
              ? pickedId
                ? `Waiting on case #${pickedId}`
                : "Cases are opening"
              : "Stand by"}
        </h1>
        {playerCode ? (
          <p className="mt-2 text-sm tracking-widest text-neutral-500">
            {playerCode}
          </p>
        ) : null}
      </div>

      {checking ? (
        <p className="text-center text-sm text-neutral-400">Checking your pick…</p>
      ) : null}

      {pickedId != null && me?.result === "waiting" ? (
        <div className="mx-auto mt-2 max-w-sm rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-5 text-center">
          <p className="text-sm text-sky-200">Your case is locked in</p>
          <p className="mt-2 text-4xl font-bold text-white">#{pickedId}</p>
          <p className="mt-3 text-sm text-neutral-400">
            When the operator opens it, you’ll see green or red here.
          </p>
        </div>
      ) : null}

      {takeIt.phase === "pick" || takeIt.phase === "playing" ? (
        <div
          className="mx-auto mt-4 grid w-full max-w-lg gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(columns, 3)}, minmax(0, 1fr))`,
          }}
        >
          {takeIt.cases.map((c) => {
            const mine = pickedId === c.id;
            const disabled =
              loading ||
              !canPick ||
              c.opened ||
              takeIt.phase !== "pick";
            return (
              <button
                key={c.id}
                type="button"
                disabled={disabled && !mine}
                onClick={() => onPick(c.id)}
                className={`rounded-xl border px-2 py-5 text-xl font-bold ${
                  mine
                    ? "border-sky-400 bg-sky-500/20 text-sky-100"
                    : c.opened
                      ? c.card === "green"
                        ? "border-emerald-600 bg-emerald-950 text-emerald-300"
                        : "border-red-600 bg-red-950 text-red-300"
                      : canPick
                        ? "border-amber-500/50 bg-neutral-900 text-amber-200 hover:bg-amber-500 hover:text-neutral-950"
                        : "border-neutral-800 bg-neutral-900 text-neutral-500"
                }`}
              >
                {c.id}
                {c.opened ? (
                  <span className="mt-1 block text-xs font-medium">
                    {takeItCardLabel(c.card)}
                  </span>
                ) : mine ? (
                  <span className="mt-1 block text-xs font-medium">Yours</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-neutral-400">
          Waiting for the operator to start a round.
        </p>
      )}

      {message ? (
        <p className="mt-4 text-center text-sm text-amber-300">{message}</p>
      ) : null}
    </div>
  );
}
