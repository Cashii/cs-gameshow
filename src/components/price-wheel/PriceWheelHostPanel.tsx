"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { useSuite } from "@/lib/suite-provider";
import { uid } from "@/lib/utils";
import {
  PRICE_WHEEL_SCORE_PRESETS,
  addPriceWheelScore,
  clampPriceWheelScore,
  createDefaultPriceWheelState,
} from "@/lib/price-wheel/types";

export function PriceWheelHostPanel() {
  const { state, updatePriceWheel } = useSuite();
  const game = state.priceWheel ?? createDefaultPriceWheelState();
  const spectatorLive = state.spectatorGame === "priceWheel";
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {},
  );

  const setPlayerScore = (playerId: string, score: number) => {
    updatePriceWheel((prev) => ({
      ...prev,
      players: prev.players.map((item) =>
        item.id === playerId
          ? { ...item, score: clampPriceWheelScore(score) }
          : item,
      ),
    }));
  };

  const bumpPlayerScore = (playerId: string, delta: number) => {
    updatePriceWheel((prev) => ({
      ...prev,
      players: prev.players.map((item) =>
        item.id === playerId
          ? { ...item, score: addPriceWheelScore(item.score, delta) }
          : item,
      ),
    }));
  };

  const applyCustomAmount = (playerId: string, score: number) => {
    const raw = customAmounts[playerId] ?? "";
    const amount = Number.parseInt(raw, 10);
    if (!Number.isFinite(amount) || amount === 0) return;
    setPlayerScore(playerId, addPriceWheelScore(score, amount));
    setCustomAmounts((prev) => ({ ...prev, [playerId]: "" }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Price Wheel. Use the Spectator screen list so the
          projector shows the scoreboard.
        </SpectatorScreenNotice>
      )}
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <h2 className="mb-4 text-base font-bold text-white">Players</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {game.players.map((player, index) => {
            const customValue = customAmounts[player.id] ?? "";
            return (
              <article
                key={player.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    value={player.name}
                    aria-label={`Player ${index + 1} name`}
                    placeholder={`Player ${index + 1}`}
                    onChange={(e) =>
                      updatePriceWheel((prev) => ({
                        ...prev,
                        players: prev.players.map((item) =>
                          item.id === player.id
                            ? { ...item, name: e.target.value.slice(0, 40) }
                            : item,
                        ),
                      }))
                    }
                    className="h-10 min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Remove player ${index + 1}`}
                    onClick={() =>
                      updatePriceWheel((prev) => ({
                        ...prev,
                        players: prev.players.filter(
                          (item) => item.id !== player.id,
                        ),
                      }))
                    }
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <input
                  type="number"
                  value={player.score}
                  aria-label={`Player ${index + 1} score`}
                  onChange={(e) =>
                    setPlayerScore(player.id, Number(e.target.value))
                  }
                  className="h-14 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-center text-2xl font-bold text-white tabular-nums focus:border-sky-500 focus:outline-none"
                />

                <div className="grid grid-cols-5 gap-1.5">
                  {PRICE_WHEEL_SCORE_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => bumpPlayerScore(player.id, amount)}
                      className="h-10 rounded-md border border-teal-600 bg-teal-700 text-sm font-bold text-white hover:bg-teal-600"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={customValue}
                    placeholder="Custom"
                    aria-label={`Custom amount for player ${index + 1}`}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({
                        ...prev,
                        [player.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCustomAmount(player.id, player.score);
                      }
                    }}
                    className="h-10 min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-center text-base font-semibold text-white tabular-nums placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!customValue.trim()}
                    onClick={() => applyCustomAmount(player.id, player.score)}
                    className="inline-flex h-10 shrink-0 items-center rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    disabled={!customValue.trim()}
                    onClick={() => {
                      const amount = Number.parseInt(customValue, 10);
                      if (!Number.isFinite(amount) || amount === 0) return;
                      setPlayerScore(
                        player.id,
                        addPriceWheelScore(player.score, -Math.abs(amount)),
                      );
                      setCustomAmounts((prev) => ({
                        ...prev,
                        [player.id]: "",
                      }));
                    }}
                    className="inline-flex h-10 shrink-0 items-center rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
                  >
                    Subtract
                  </button>
                </div>
              </article>
            );
          })}
          <button
            type="button"
            onClick={() =>
              updatePriceWheel((prev) => ({
                ...prev,
                players: [...prev.players, { id: uid(), name: "", score: 0 }],
              }))
            }
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-600 bg-neutral-900/40 text-sm font-semibold text-neutral-400 hover:border-sky-500 hover:text-sky-300"
          >
            <Plus size={22} />
            Add player
          </button>
        </div>
      </div>
    </div>
  );
}
