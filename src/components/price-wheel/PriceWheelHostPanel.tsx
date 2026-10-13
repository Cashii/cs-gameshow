"use client";

import { Plus, Trash2 } from "lucide-react";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { useSuite } from "@/lib/suite-provider";
import { uid } from "@/lib/utils";
import {
  clampPriceWheelScore,
  createDefaultPriceWheelState,
} from "@/lib/price-wheel/types";

export function PriceWheelHostPanel() {
  const { state, updatePriceWheel } = useSuite();
  const game = state.priceWheel ?? createDefaultPriceWheelState();
  const spectatorLive = state.spectatorGame === "priceWheel";

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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {game.players.map((player, index) => (
            <article
              key={player.id}
              className="flex min-h-40 flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
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
                onChange={(e) => {
                  const score = clampPriceWheelScore(Number(e.target.value));
                  updatePriceWheel((prev) => ({
                    ...prev,
                    players: prev.players.map((item) =>
                      item.id === player.id ? { ...item, score } : item,
                    ),
                  }));
                }}
                className="mt-auto h-14 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-center text-2xl font-bold text-white tabular-nums focus:border-sky-500 focus:outline-none"
              />
            </article>
          ))}
          <button
            type="button"
            onClick={() =>
              updatePriceWheel((prev) => ({
                ...prev,
                players: [...prev.players, { id: uid(), name: "", score: 0 }],
              }))
            }
            className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-600 bg-neutral-900/40 text-sm font-semibold text-neutral-400 hover:border-sky-500 hover:text-sky-300"
          >
            <Plus size={22} />
            Add player
          </button>
        </div>
      </div>
    </div>
  );
}
