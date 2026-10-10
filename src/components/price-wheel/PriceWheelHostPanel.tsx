"use client";

import { Trash2 } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { uid } from "@/lib/utils";
import {
  clampPriceWheelScore,
  createDefaultPriceWheelState,
} from "@/lib/price-wheel/types";

export function PriceWheelHostPanel() {
  const { state, updatePriceWheel } = useSuite();
  const game = state.priceWheel ?? createDefaultPriceWheelState();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Players</h2>
          <button
            type="button"
            onClick={() =>
              updatePriceWheel((prev) => ({
                ...prev,
                players: [
                  ...prev.players,
                  { id: uid(), name: "", score: 0 },
                ],
              }))
            }
            className="h-9 rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Add player
          </button>
        </div>
        {game.players.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Add a player to put a name and score on the spectator screen.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {game.players.map((player, index) => (
              <li
                key={player.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 p-2"
              >
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
                  className="h-10 w-28 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-right text-base text-white tabular-nums focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Remove player ${index + 1}`}
                  onClick={() =>
                    updatePriceWheel((prev) => ({
                      ...prev,
                      players: prev.players.filter((item) => item.id !== player.id),
                    }))
                  }
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
