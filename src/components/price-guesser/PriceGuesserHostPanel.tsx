"use client";

import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  createDefaultPriceGuesserState,
  type PriceGuesserState,
} from "@/lib/price-guesser/types";
import { parsePriceInput, priceInputValue } from "@/lib/price/format";
import { deleteMediaByUrl } from "@/lib/media/upload";
import { ImageUploadField } from "@/components/price/ImageUploadField";
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useEffect, useState } from "react";

export function PriceGuesserHostPanel() {
  const { state, updatePriceGuesser } = useSuite();
  const game = state.priceGuesser ?? createDefaultPriceGuesserState();
  const { toastMessage, showToast } = useToast();
  const spectatorLive = state.spectatorGame === "priceGuesser";
  const [confirmReset, setConfirmReset] = useState(false);
  const [priceText, setPriceText] = useState(() => priceInputValue(game.price));

  useEffect(() => {
    setPriceText(priceInputValue(game.price));
  }, [game.imageUrl]);

  const patch = (updater: (prev: PriceGuesserState) => PriceGuesserState) => {
    updatePriceGuesser(updater);
  };

  const reset = () => {
    if (game.imageUrl) void deleteMediaByUrl(game.imageUrl);
    patch(() => createDefaultPriceGuesserState());
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6">
        <div>
          <h2 className="text-lg font-bold text-white">Price Guesser</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Put an item on the projector with a hidden price tag. After the
            player guesses out loud, reveal the real price.
          </p>
        </div>

        {!spectatorLive && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Spectator is not on Price Guesser. Use the Spectator screen list so
            the projector shows the item.
          </p>
        )}

        <ImageUploadField
          imageUrl={game.imageUrl}
          onUploaded={(url) =>
            patch((prev) => ({ ...prev, imageUrl: url, priceRevealed: false }))
          }
          onError={showToast}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Item name (optional)
          </span>
          <input
            type="text"
            value={game.label}
            onChange={(event) =>
              patch((prev) => ({ ...prev, label: event.target.value }))
            }
            placeholder="Espresso machine"
            className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Price
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={priceText}
            onChange={(event) => {
              const next = event.target.value;
              setPriceText(next);
              patch((prev) => ({
                ...prev,
                price: parsePriceInput(next),
                priceRevealed: false,
              }));
            }}
            placeholder="49.99"
            className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!game.imageUrl || game.price == null}
            onClick={() =>
              patch((prev) => ({ ...prev, priceRevealed: !prev.priceRevealed }))
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            {game.priceRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
            {game.priceRevealed ? "Hide price" : "Reveal price"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-600 px-5 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800"
          >
            <RotateCcw size={16} />
            Clear item
          </button>
        </div>
      </div>
      <Toast message={toastMessage} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Clear this item?"
        message="The photo and price will be removed from the spectator screen."
        confirmLabel="Clear"
        variant="danger"
        onConfirm={reset}
      />
    </div>
  );
}
