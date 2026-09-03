"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  PRICE_ORDER_MAX_ITEMS,
  createDefaultPriceOrderState,
  createEmptyPriceOrderItem,
  isPlayerOrderCorrect,
  orderedPriceOrderItems,
  priceOrderResultReady,
  priceOrderSlots,
  syncPriceOrderSlots,
  unplacedPriceOrderItems,
  visiblePriceOrderItems,
  type PriceOrderItem,
  type PriceOrderState,
} from "@/lib/price-order/types";
import {
  formatPrice,
  parsePriceInput,
  priceInputValue,
} from "@/lib/price/format";
import {
  DEFAULT_PHOTO_FIT,
  photoFitStyle,
  type PhotoFit,
} from "@/lib/price/photo-fit";
import { deleteMediaByUrl } from "@/lib/media/upload";
import { SquarePhotoEditor } from "@/components/price/SquarePhotoEditor";
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperatorNotice } from "@/components/operator/OperatorNotice";
import { StatusSwitch } from "@/components/operator/StatusSwitch";

export function PriceOrderHostPanel() {
  const { state, updatePriceOrder } = useSuite();
  const game = state.priceOrder ?? createDefaultPriceOrderState();
  const { toastMessage, showToast } = useToast();
  const spectatorLive = state.spectatorGame === "priceOrder";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const patch = (updater: (prev: PriceOrderState) => PriceOrderState) => {
    updatePriceOrder(updater);
  };

  const unplaced = unplacedPriceOrderItems(game);
  const ordered = orderedPriceOrderItems(game);
  const slots = priceOrderSlots(game);
  const canAdd = game.items.length < PRICE_ORDER_MAX_ITEMS;
  const selectedUnplaced =
    selectedId && unplaced.some((item) => item.id === selectedId)
      ? selectedId
      : null;

  const updateItem = (
    id: string,
    updater: (item: PriceOrderItem) => PriceOrderItem,
  ) => {
    patch((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? updater(item) : item)),
    }));
  };

  const addItem = () => {
    if (!canAdd) return;
    patch((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyPriceOrderItem()],
    }));
  };

  const removeItem = (id: string) => {
    const item = game.items.find((entry) => entry.id === id);
    if (item?.imageUrl) void deleteMediaByUrl(item.imageUrl);
    if (selectedId === id) setSelectedId(null);
    patch((prev) => {
      const items = prev.items.filter((entry) => entry.id !== id);
      return {
        ...prev,
        items,
        order: syncPriceOrderSlots(
          prev.order.map((entryId) => (entryId === id ? null : entryId)),
          visiblePriceOrderItems({ ...prev, items }),
        ),
      };
    });
  };

  const placeSelectedAt = (index: number) => {
    if (!selectedUnplaced) return;
    const id = selectedUnplaced;
    patch((prev) => {
      const visible = visiblePriceOrderItems(prev);
      const next = syncPriceOrderSlots(prev.order, visible);
      if (next[index] || next.includes(id)) return prev;
      next[index] = id;
      return { ...prev, order: next };
    });
    setSelectedId(null);
  };

  const moveOrdered = (index: number, direction: -1 | 1) => {
    patch((prev) => {
      const visible = visiblePriceOrderItems(prev);
      const next = syncPriceOrderSlots(prev.order, visible);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= next.length) return prev;
      const current = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = current;
      return { ...prev, order: next };
    });
  };

  const removeFromOrder = (id: string) => {
    patch((prev) => ({
      ...prev,
      order: syncPriceOrderSlots(
        prev.order.map((entryId) => (entryId === id ? null : entryId)),
        visiblePriceOrderItems(prev),
      ),
    }));
  };

  const revealItem = (id: string, revealed: boolean) => {
    updateItem(id, (item) => ({ ...item, priceRevealed: revealed }));
  };

  const resultReady = priceOrderResultReady(game);
  const resultCorrect = resultReady && isPlayerOrderCorrect(game);
  const resultAction = resultButton(
    Boolean(game.resultShown),
    resultReady,
    resultCorrect,
  );

  const hideAll = () => {
    patch((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, priceRevealed: false })),
    }));
  };

  const clearOrder = () => {
    patch((prev) => ({
      ...prev,
      order: visiblePriceOrderItems(prev).map(() => null),
      items: prev.items.map((item) => ({ ...item, priceRevealed: false })),
    }));
    setSelectedId(null);
  };

  const reset = () => {
    for (const item of game.items) {
      if (item.imageUrl) void deleteMediaByUrl(item.imageUrl);
    }
    setSelectedId(null);
    patch(() => createDefaultPriceOrderState());
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
            disabled={ordered.length === 0}
            onClick={hideAll}
            className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hide all prices
          </button>
          <button
            type="button"
            disabled={visiblePriceOrderItems(game).length === 0}
            onClick={() =>
              patch((prev) => ({
                ...prev,
                items: prev.items.map((item) =>
                  item.imageUrl ? { ...item, itemRevealed: true } : item,
                ),
              }))
            }
            className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reveal all items
          </button>
          <button
            type="button"
            disabled={visiblePriceOrderItems(game).length === 0}
            onClick={() =>
              patch((prev) => ({
                ...prev,
                items: prev.items.map((item) => ({
                  ...item,
                  itemRevealed: false,
                })),
              }))
            }
            className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Close all curtains
          </button>
          <button
            type="button"
            disabled={!resultReady && !game.resultShown}
            onClick={() =>
              patch((prev) => ({ ...prev, resultShown: !prev.resultShown }))
            }
            className={`inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500 ${resultAction.className}`}
          >
            {resultAction.label}
          </button>
          <button
            type="button"
            disabled={ordered.length === 0}
            onClick={clearOrder}
            className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear list
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RotateCcw size={16} />
            Reset game
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          {!spectatorLive && (
            <OperatorNotice>
              Spectator is not on Price Order. Use the Spectator screen list so
              the projector shows the items.
            </OperatorNotice>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4 lg:sticky lg:top-4">
              {unplaced.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {unplaced.map((item) => {
                    const selected = selectedUnplaced === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedId((current) =>
                            current === item.id ? null : item.id,
                          );
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm ${
                          selected
                            ? "border-sky-400 bg-sky-500/15 text-white ring-2 ring-sky-400/60"
                            : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500"
                        }`}
                      >
                        <CroppedThumb
                          src={item.imageUrl}
                          fit={item.photoFit}
                          className="h-10 w-10 rounded"
                        />
                        <span className="max-w-28 truncate">
                          {item.label.trim() || "Untitled"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Player order (cheapest → most expensive)
                </h3>
                {slots.length === 0 && game.items.length > 0 && (
                  <p className="text-sm text-neutral-500">Empty list</p>
                )}
                {slots.map((item, index) =>
                  item ? (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2"
                    >
                      <span className="w-6 text-center text-sm font-bold text-amber-300">
                        {index + 1}
                      </span>
                      <CroppedThumb
                        src={item.imageUrl}
                        fit={item.photoFit}
                        className="h-12 w-12 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.label.trim() || "Untitled"}
                          </p>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-amber-300">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <StatusSwitch
                          checked={item.itemRevealed !== false}
                          labelOn="Curtain open"
                          labelOff="Curtain closed"
                          ariaLabel={`${item.label.trim() || "Item"} curtain`}
                          onToggle={() =>
                            updateItem(item.id, (prev) => ({
                              ...prev,
                              itemRevealed: !(prev.itemRevealed !== false),
                            }))
                          }
                        />
                        <StatusSwitch
                          checked={item.priceRevealed}
                          disabled={item.price == null}
                          labelOn="Price showing"
                          labelOff="Price hidden"
                          ariaLabel={`${item.label.trim() || "Item"} price`}
                          onToggle={() =>
                            revealItem(item.id, !item.priceRevealed)
                          }
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveOrdered(index, -1)}
                          className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={index === slots.length - 1}
                          onClick={() => moveOrdered(index, 1)}
                          className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromOrder(item.id)}
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                          aria-label="Clear from list"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={`slot-${index}`}
                      type="button"
                      disabled={!selectedUnplaced}
                      onClick={() => placeSelectedAt(index)}
                      className={`flex min-h-14 items-center gap-3 rounded-xl border border-dashed px-3 py-2 text-left text-sm ${
                        selectedUnplaced
                          ? "border-sky-500 bg-sky-500/10 text-sky-200 hover:border-sky-400"
                          : "border-neutral-800 bg-neutral-950 text-neutral-500"
                      }`}
                    >
                      <span className="w-6 text-center text-sm font-bold text-amber-300/80">
                        {index + 1}
                      </span>
                      <span>
                        {selectedUnplaced
                          ? `Place in slot ${index + 1}`
                          : `Slot ${index + 1}`}
                      </span>
                    </button>
                  ),
                )}
              </section>
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Items ({game.items.length}/{PRICE_ORDER_MAX_ITEMS})
                </h3>
                {game.items.length > 0 && (
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                  >
                    <Plus size={14} />
                    Add item
                  </button>
                )}
              </div>

              {game.items.length === 0 && (
                <div className="flex flex-col items-start gap-3 py-8">
                  <p className="text-sm text-neutral-400">
                    No items yet. Add up to five with a photo and price.
                  </p>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500"
                  >
                    <Plus size={14} />
                    Add item
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {game.items.map((item, index) => (
                  <article
                    key={item.id}
                    className="flex w-64 shrink-0 flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        Item {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <SquarePhotoEditor
                      imageUrl={item.imageUrl}
                      fit={item.photoFit ?? DEFAULT_PHOTO_FIT}
                      onUploaded={(url) =>
                        updateItem(item.id, (prev) => ({
                          ...prev,
                          imageUrl: url,
                          priceRevealed: false,
                          itemRevealed: false,
                          photoFit: { ...DEFAULT_PHOTO_FIT },
                        }))
                      }
                      onFitChange={(photoFit) =>
                        updateItem(item.id, (prev) => ({ ...prev, photoFit }))
                      }
                      onError={showToast}
                    />
                    {item.imageUrl ? (
                      <StatusSwitch
                        checked={item.itemRevealed !== false}
                        labelOn="Curtain open"
                        labelOff="Curtain closed"
                        ariaLabel={`${item.label.trim() || `Item ${index + 1}`} curtain`}
                        onToggle={() =>
                          updateItem(item.id, (prev) => ({
                            ...prev,
                            itemRevealed: !(prev.itemRevealed !== false),
                          }))
                        }
                      />
                    ) : null}
                    <input
                      type="text"
                      value={item.label}
                      onChange={(event) =>
                        updateItem(item.id, (prev) => ({
                          ...prev,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Name (optional)"
                      className="h-8 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        priceDrafts[item.id] ?? priceInputValue(item.price)
                      }
                      onChange={(event) => {
                        const next = event.target.value;
                        setPriceDrafts((drafts) => ({
                          ...drafts,
                          [item.id]: next,
                        }));
                        updateItem(item.id, (prev) => ({
                          ...prev,
                          price: parsePriceInput(next),
                          priceRevealed: false,
                        }));
                      }}
                      placeholder="Price"
                      className="h-8 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                    />
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Price Order?"
        message="This removes every item, photo, and the player list from the spectator screen."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={reset}
      />
    </div>
  );
}

function resultButton(
  shown: boolean,
  ready: boolean,
  correct: boolean,
): { label: string; className: string } {
  if (shown) {
    return {
      label: "Hide result",
      className: "border-teal-500 bg-teal-600 hover:bg-teal-500",
    };
  }
  if (correct) {
    return {
      label: "Show Perfect order",
      className: "border-green-500 bg-green-600 hover:bg-green-700",
    };
  }
  if (ready) {
    return {
      label: "Show Not quite",
      className: "border-red-500 bg-red-600 hover:bg-red-700",
    };
  }
  return {
    label: "Show result",
    className: "border-neutral-600 bg-neutral-700 text-neutral-500",
  };
}

function CroppedThumb({
  src,
  fit,
  className,
}: Readonly<{
  src: string;
  fit: PhotoFit | undefined;
  className: string;
}>) {
  if (!src) {
    return <span className={`bg-neutral-800 ${className}`} />;
  }
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full"
        style={photoFitStyle(fit)}
      />
    </span>
  );
}
