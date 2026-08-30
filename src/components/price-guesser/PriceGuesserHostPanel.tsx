"use client";

import { RotateCcw } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  createDefaultPriceGuesserState,
  type PriceGuesserResult,
  type PriceGuesserState,
} from "@/lib/price-guesser/types";
import { parsePriceInput, priceInputValue } from "@/lib/price/format";
import { deleteMediaByUrl } from "@/lib/media/upload";
import { SquarePhotoEditor } from "@/components/price/SquarePhotoEditor";
import { DEFAULT_PHOTO_FIT } from "@/lib/price/photo-fit";
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperatorNotice } from "@/components/operator/OperatorNotice";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
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

  const itemShowing = game.itemRevealed !== false;
  const priceShowing = Boolean(game.priceRevealed);
  const hasItem = Boolean(game.imageUrl);

  const toggleResult = (kind: PriceGuesserResult) => {
    patch((prev) => ({
      ...prev,
      resultOverlay: prev.resultOverlay === kind ? null : kind,
    }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          <StatusSwitch
            checked={itemShowing}
            disabled={!game.imageUrl}
            labelOn="Item showing"
            labelOff="Curtain closed"
            ariaLabel="Toggle curtain"
            onToggle={() =>
              patch((prev) => ({ ...prev, itemRevealed: !prev.itemRevealed }))
            }
          />
          <StatusSwitch
            checked={priceShowing}
            disabled={!game.imageUrl || game.price == null}
            labelOn="Price showing"
            labelOff="Price hidden"
            ariaLabel="Toggle price"
            onToggle={() =>
              patch((prev) => ({ ...prev, priceRevealed: !prev.priceRevealed }))
            }
          />
          <button
            type="button"
            disabled={!hasItem && game.resultOverlay !== "correct"}
            onClick={() => toggleResult("correct")}
            className={`inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500 ${
              game.resultOverlay === "correct"
                ? "border-teal-500 bg-teal-600 hover:bg-teal-500"
                : "border-green-500 bg-green-600 hover:bg-green-700"
            }`}
          >
            {game.resultOverlay === "correct" ? "Hide result" : "Show Correct"}
          </button>
          <button
            type="button"
            disabled={!hasItem && game.resultOverlay !== "wrong"}
            onClick={() => toggleResult("wrong")}
            className={`inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500 ${
              game.resultOverlay === "wrong"
                ? "border-teal-500 bg-teal-600 hover:bg-teal-500"
                : "border-red-500 bg-red-600 hover:bg-red-700"
            }`}
          >
            {game.resultOverlay === "wrong" ? "Hide result" : "Show Not quite"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
          >
            <RotateCcw size={16} />
            Clear item
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          {!spectatorLive && (
            <OperatorNotice>
              Spectator is not on Price Guesser. Use the Spectator screen list so
              the projector shows the item.
            </OperatorNotice>
          )}

          <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
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
            </div>

            <div className="mx-auto w-full max-w-sm shrink-0 md:mx-0">
              <SquarePhotoEditor
                imageUrl={game.imageUrl}
                fit={game.photoFit ?? DEFAULT_PHOTO_FIT}
                onUploaded={(url) =>
                  patch((prev) => ({
                    ...prev,
                    imageUrl: url,
                    priceRevealed: false,
                    itemRevealed: false,
                    resultOverlay: null,
                    photoFit: { ...DEFAULT_PHOTO_FIT },
                  }))
                }
                onFitChange={(photoFit) =>
                  patch((prev) => ({ ...prev, photoFit }))
                }
                onError={showToast}
              />
            </div>
          </div>
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
