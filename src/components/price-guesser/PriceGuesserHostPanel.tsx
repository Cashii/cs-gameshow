"use client";

import { FolderOpen, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  advancePriceGuesserFromQueue,
  createDefaultPriceGuesserState,
  createPriceGuesserQueuedItem,
  priceGuesserImageUrls,
  type PriceGuesserQueuedItem,
  type PriceGuesserResult,
  type PriceGuesserState,
} from "@/lib/price-guesser/types";
import { formatPrice, parsePriceInput, priceInputValue } from "@/lib/price/format";
import { copyMediaUrl, deleteMediaByUrl } from "@/lib/media/upload";
import { PriceItemLibrary } from "@/components/price/PriceItemLibrary";
import {
  mergePriceCatalog,
  priceCatalogKey,
  priceImageStillUsed,
  type PriceCatalogItem,
} from "@/lib/price/catalog";
import { uid } from "@/lib/utils";
import { SquarePhotoEditor } from "@/components/price/SquarePhotoEditor";
import { DEFAULT_PHOTO_FIT, photoFitStyle } from "@/lib/price/photo-fit";
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QueueMoveControls } from "@/components/ui/QueueMoveControls";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
import { useEffect, useState } from "react";

export function PriceGuesserHostPanel() {
  const { state, updatePriceGuesser, updatePriceCatalog } = useSuite();
  const game = state.priceGuesser ?? createDefaultPriceGuesserState();
  const catalog = state.priceCatalog ?? [];
  const queue = game.queue ?? [];
  const { toastMessage, showToast } = useToast();
  const spectatorLive = state.spectatorGame === "priceGuesser";
  const [confirmReset, setConfirmReset] = useState(false);
  const [bankOpenRequest, setBankOpenRequest] = useState(0);
  const [priceText, setPriceText] = useState(() => priceInputValue(game.price));

  useEffect(() => {
    setPriceText(priceInputValue(game.price));
  }, [game.imageUrl, game.price]);

  const patch = (updater: (prev: PriceGuesserState) => PriceGuesserState) => {
    updatePriceGuesser(updater);
  };

  const savedUrls = () =>
    new Set(catalog.map((entry) => entry.imageUrl).filter(Boolean));

  const orderImageUrls = () =>
    (state.priceOrder?.items ?? []).map((item) => item.imageUrl);

  const liveImageUrls = () => [
    ...priceGuesserImageUrls(state.priceGuesser),
    ...orderImageUrls(),
  ];

  const clearDesk = () => {
    const url = game.imageUrl;
    patch((prev) => ({
      ...createDefaultPriceGuesserState(),
      queue: prev.queue ?? [],
    }));
    if (
      url &&
      !priceImageStillUsed(url, catalog, "", [
        ...queue.map((item) => item.imageUrl),
        ...orderImageUrls(),
      ])
    ) {
      void deleteMediaByUrl(url);
    }
  };

  const setQueue = (
    nextQueue: PriceGuesserState["queue"],
    removedUrls: string[] = [],
  ) => {
    const deskUrl = game.imageUrl;
    patch((prev) => ({ ...prev, queue: nextQueue }));
    for (const url of removedUrls) {
      if (
        !url ||
        priceImageStillUsed(url, catalog, "", [
          deskUrl,
          ...nextQueue.map((item) => item.imageUrl),
          ...orderImageUrls(),
        ])
      ) {
        continue;
      }
      void deleteMediaByUrl(url);
    }
  };

  const moveQueueItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= queue.length) return;
    const next = [...queue];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setQueue(next);
  };

  const queueFromCatalog = async (id: string) => {
    const entry = catalog.find((item) => item.id === id);
    if (!entry) return;
    const imageUrl = entry.imageUrl ? await copyMediaUrl(entry.imageUrl) : "";
    patch((prev) => ({
      ...prev,
      queue: [
        ...(prev.queue ?? []),
        createPriceGuesserQueuedItem({
          imageUrl,
          label: entry.label,
          price: entry.price,
          photoFit: entry.photoFit,
        }),
      ],
    }));
    showToast("Added to upcoming");
  };

  const queueCurrentDesk = async () => {
    if (!game.imageUrl && !game.label.trim() && game.price == null) return;
    const imageUrl = game.imageUrl ? await copyMediaUrl(game.imageUrl) : "";
    patch((prev) => ({
      ...prev,
      queue: [
        ...(prev.queue ?? []),
        createPriceGuesserQueuedItem({
          imageUrl,
          label: prev.label,
          price: prev.price,
          photoFit: prev.photoFit,
        }),
      ],
    }));
    showToast("Current item added to upcoming");
  };

  const loadNextFromQueue = () => {
    const previousUrl = game.imageUrl;
    const advanced = advancePriceGuesserFromQueue(game);
    if (!advanced) return;
    patch(() => advanced);
    if (
      previousUrl &&
      previousUrl !== advanced.imageUrl &&
      !priceImageStillUsed(previousUrl, catalog, "", [
        ...priceGuesserImageUrls(advanced),
        ...orderImageUrls(),
      ])
    ) {
      void deleteMediaByUrl(previousUrl);
    }
    showToast("Next item loaded");
  };

  const itemShowing = game.itemRevealed !== false;
  const priceShowing = Boolean(game.priceRevealed);
  const hasItem = Boolean(game.imageUrl);
  const canQueueCurrent =
    Boolean(game.imageUrl) || Boolean(game.label.trim()) || game.price != null;

  const toggleResult = (kind: PriceGuesserResult) => {
    patch((prev) => ({
      ...prev,
      resultOverlay: prev.resultOverlay === kind ? null : kind,
    }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
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
            disabled={queue.length === 0}
            onClick={loadNextFromQueue}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-500 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            <SkipForward size={16} />
            Next item
            {queue.length > 0 ? ` (${queue.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
          >
            <RotateCcw size={16} />
            Clear item
          </button>
          <div className="ml-auto">
            <PriceItemLibrary
              items={catalog}
              openRequest={bankOpenRequest}
              closeOnLoad
              saveLabel="Save this item"
              saveDisabled={
                !game.imageUrl && !game.label.trim() && game.price == null
              }
              pickHint="Click an item to put it on the desk, or Queue to stage it for later. The curtain starts closed."
              onSave={async () => {
                const draft: PriceCatalogItem = {
                  id: "draft",
                  imageUrl: game.imageUrl,
                  label: game.label,
                  price: game.price,
                  photoFit: game.photoFit,
                };
                const key = priceCatalogKey(draft);
                if (catalog.some((item) => priceCatalogKey(item) === key)) {
                  return;
                }
                const imageUrl = game.imageUrl
                  ? await copyMediaUrl(game.imageUrl)
                  : "";
                const entry: PriceCatalogItem = { ...draft, id: uid(), imageUrl };
                updatePriceCatalog((items) => mergePriceCatalog(items, [entry]));
              }}
              onLoad={async (id) => {
                const entry = catalog.find((item) => item.id === id);
                if (!entry) return;
                const imageUrl = entry.imageUrl
                  ? await copyMediaUrl(entry.imageUrl)
                  : "";
                updatePriceGuesser((prev) => {
                  if (
                    prev.imageUrl &&
                    prev.imageUrl !== imageUrl &&
                    !savedUrls().has(prev.imageUrl) &&
                    !(prev.queue ?? []).some(
                      (item) => item.imageUrl === prev.imageUrl,
                    )
                  ) {
                    void deleteMediaByUrl(prev.imageUrl);
                  }
                  return {
                    ...prev,
                    imageUrl,
                    label: entry.label,
                    price: entry.price,
                    photoFit: entry.photoFit,
                    priceRevealed: false,
                    itemRevealed: false,
                    resultOverlay: null,
                  };
                });
              }}
              onQueue={(id) => void queueFromCatalog(id)}
              onDelete={(id) => {
                const entry = catalog.find((item) => item.id === id);
                updatePriceCatalog((items) =>
                  items.filter((item) => item.id !== id),
                );
                const url = entry?.imageUrl;
                if (!url || priceImageStillUsed(url, catalog, id, liveImageUrls())) {
                  return;
                }
                void deleteMediaByUrl(url);
              }}
            />
          </div>
        </div>
      </div>

      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Price is Tight. Use the Spectator screen list so
          the projector shows the item.
        </SpectatorScreenNotice>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex w-[28rem] max-w-full shrink-0 flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price-guesser-name"
                  className="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                >
                  Item name (optional)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="price-guesser-name"
                    type="text"
                    value={game.label}
                    onChange={(event) =>
                      patch((prev) => ({ ...prev, label: event.target.value }))
                    }
                    placeholder="Espresso machine"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                  />
                  <div className="w-48 shrink-0">
                    <StatusSwitch
                      checked={itemShowing}
                      disabled={!game.imageUrl}
                      labelOn="Item showing"
                      labelOff="Curtain closed"
                      ariaLabel="Toggle curtain"
                      onToggle={() =>
                        patch((prev) => ({
                          ...prev,
                          itemRevealed: !prev.itemRevealed,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price-guesser-price"
                  className="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                >
                  Price
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="price-guesser-price"
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
                    className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                  />
                  <div className="w-48 shrink-0">
                    <StatusSwitch
                      checked={priceShowing}
                      disabled={!game.imageUrl || game.price == null}
                      labelOn="Price showing"
                      labelOff="Price hidden"
                      ariaLabel="Toggle price"
                      onToggle={() =>
                        patch((prev) => ({
                          ...prev,
                          priceRevealed: !prev.priceRevealed,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-80 max-w-full shrink-0 flex-col gap-3">
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
              <button
                type="button"
                onClick={() => setBankOpenRequest((current) => current + 1)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-500 bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-500"
              >
                <FolderOpen size={16} />
                Choose from item bank
              </button>
            </div>
          </div>

          <section className="border-t border-neutral-800 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Upcoming items ({queue.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBankOpenRequest((current) => current + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
                >
                  <FolderOpen size={14} />
                  Add saved
                </button>
                <button
                  type="button"
                  disabled={!canQueueCurrent}
                  onClick={() => void queueCurrentDesk()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Queue current
                </button>
              </div>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Stage items here from the bank, or queue the current desk item.
                {" "}
                <span className="font-semibold text-neutral-400">Next item</span>
                {" "}
                loads the first one onto the desk with the curtain closed.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-neutral-500">
                  Use the arrows to reorder. Top item plays next.
                </p>
                <ul className="flex max-w-2xl flex-col gap-2">
                  {queue.map((item, index) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      index={index}
                      canMoveUp={index > 0}
                      canMoveDown={index < queue.length - 1}
                      onMoveUp={() => moveQueueItem(index, -1)}
                      onMoveDown={() => moveQueueItem(index, 1)}
                      onRemove={() => {
                        setQueue(
                          queue.filter((entry) => entry.id !== item.id),
                          [item.imageUrl],
                        );
                      }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
      <Toast message={toastMessage} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Clear this item?"
        message="The photo and price will be removed from the spectator screen. Upcoming items stay queued."
        confirmLabel="Clear"
        variant="danger"
        onConfirm={clearDesk}
      />
    </div>
  );
}

function QueueRow({
  item,
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Readonly<{
  item: PriceGuesserQueuedItem;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}>) {
  const name = item.label.trim() || "Untitled item";

  return (
    <li className="flex items-stretch gap-2 rounded-xl border border-neutral-700 bg-neutral-800/70 p-2">
      <QueueMoveControls
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        label="item"
      />
      <span className="flex w-10 shrink-0 items-center justify-center text-lg font-bold text-neutral-400">
        {index + 1}
      </span>
      <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-950">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            draggable={false}
            className="h-full w-full"
            style={photoFitStyle(item.photoFit)}
          />
        ) : (
          <span className="flex h-full items-center justify-center px-1 text-center text-xs text-neutral-500">
            No photo
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1">
        <p className="truncate text-base font-semibold text-white">{name}</p>
        <p className="text-sm font-semibold text-amber-300">
          {formatPrice(item.price)}
        </p>
        {index === 0 ? (
          <p className="text-xs font-semibold text-sky-400">Plays next</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-14 w-14 shrink-0 self-center items-center justify-center rounded-xl border border-neutral-600 bg-neutral-900 text-neutral-300 hover:border-red-500 hover:text-red-300"
        aria-label={`Remove ${name} from queue`}
      >
        <Trash2 size={22} />
      </button>
    </li>
  );
}
