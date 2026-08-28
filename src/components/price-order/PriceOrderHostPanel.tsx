"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  PRICE_ORDER_MAX_ITEMS,
  createDefaultPriceOrderState,
  createEmptyPriceOrderItem,
  orderedPriceOrderItems,
  unplacedPriceOrderItems,
  type PriceOrderItem,
  type PriceOrderState,
} from "@/lib/price-order/types";
import { parsePriceInput, priceInputValue } from "@/lib/price/format";
import { deleteMediaByUrl } from "@/lib/media/upload";
import { ImageUploadField } from "@/components/price/ImageUploadField";
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
    patch((prev) => ({
      items: prev.items.filter((entry) => entry.id !== id),
      order: prev.order.filter((entryId) => entryId !== id),
    }));
  };

  const insertSelectedAt = (index: number) => {
    if (!selectedUnplaced) return;
    const id = selectedUnplaced;
    patch((prev) => {
      if (prev.order.includes(id)) return prev;
      const next = [...prev.order];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, id);
      return { ...prev, order: next };
    });
    setSelectedId(null);
  };

  const addToEnd = (id: string) => {
    patch((prev) =>
      prev.order.includes(id) ? prev : { ...prev, order: [...prev.order, id] },
    );
    setSelectedId(null);
  };

  const moveOrdered = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= game.order.length) return;
    patch((prev) => {
      const next = [...prev.order];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return { ...prev, order: next };
    });
  };

  const removeFromOrder = (id: string) => {
    patch((prev) => ({
      ...prev,
      order: prev.order.filter((entryId) => entryId !== id),
    }));
  };

  const revealItem = (id: string, revealed: boolean) => {
    updateItem(id, (item) => ({ ...item, priceRevealed: revealed }));
  };

  const revealAll = (revealed: boolean) => {
    patch((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, priceRevealed: revealed })),
    }));
  };

  const clearOrder = () => {
    patch((prev) => ({
      ...prev,
      order: [],
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
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900/90 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          <button
            type="button"
            disabled={ordered.length === 0}
            onClick={() => revealAll(true)}
            className="inline-flex h-10 items-center rounded-md border border-green-500 bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            Reveal all prices
          </button>
          <button
            type="button"
            disabled={ordered.length === 0}
            onClick={() => revealAll(false)}
            className="inline-flex h-10 items-center rounded-md border border-neutral-500 bg-neutral-600 px-4 text-sm font-semibold text-white hover:bg-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hide all prices
          </button>
          <button
            type="button"
            disabled={game.order.length === 0}
            onClick={clearOrder}
            className="inline-flex h-10 items-center rounded-md border border-neutral-500 bg-neutral-600 px-4 text-sm font-semibold text-white hover:bg-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-6">
        <p className="text-sm text-neutral-400">
          Show up to five items. As the player calls cheapest to most expensive,
          insert each photo into the list. Rearrange anytime, then reveal
          prices.
        </p>

        {!spectatorLive && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Spectator is not on Price Order. Use the Spectator screen list so
            the projector shows the items.
          </p>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Items ({game.items.length}/{PRICE_ORDER_MAX_ITEMS})
            </h3>
            <button
              type="button"
              disabled={!canAdd}
              onClick={addItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-600 px-3 py-1.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              <Plus size={14} />
              Add item
            </button>
          </div>

          {game.items.length === 0 && (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-6 text-sm text-neutral-500">
              Add up to five items with a photo and price.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {game.items.map((item, index) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
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
                <ImageUploadField
                  imageUrl={item.imageUrl}
                  compact
                  onUploaded={(url) =>
                    updateItem(item.id, (prev) => ({
                      ...prev,
                      imageUrl: url,
                      priceRevealed: false,
                    }))
                  }
                  onError={showToast}
                />
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
                  className="h-9 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceDrafts[item.id] ?? priceInputValue(item.price)}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPriceDrafts((drafts) => ({ ...drafts, [item.id]: next }));
                    updateItem(item.id, (prev) => ({
                      ...prev,
                      price: parsePriceInput(next),
                      priceRevealed: false,
                    }));
                  }}
                  placeholder="Price"
                  className="h-9 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Insert as the player chooses
          </h3>
          <p className="text-sm text-neutral-500">
            Select an unplaced item, then insert it at a slot. You can also add
            it to the end and move it later.
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {game.items.some((item) => item.imageUrl)
                  ? "Every item with a photo is in the list."
                  : "Upload photos first."}
              </p>
            ) : (
              unplaced.map((item) => {
                const selected = selectedUnplaced === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (ordered.length === 0) {
                        addToEnd(item.id);
                        return;
                      }
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
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <span className="h-10 w-10 rounded bg-neutral-800" />
                    )}
                    <span className="max-w-28 truncate">
                      {item.label.trim() || "Untitled"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Player order (cheapest → most expensive)
          </h3>
          <InsertSlot
            hidden={!selectedUnplaced}
            disabled={!selectedUnplaced}
            label="Insert at start"
            onInsert={() => insertSelectedAt(0)}
          />
          {ordered.length === 0 && (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-5 text-sm text-neutral-500">
              Empty list. Select an item above, then insert it here as the
              player calls it.
            </p>
          )}
          {ordered.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                <span className="w-6 text-center text-sm font-bold text-amber-300">
                  {index + 1}
                </span>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <span className="h-12 w-12 rounded bg-neutral-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {item.label.trim() || "Untitled"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.priceRevealed
                      ? priceInputValue(item.price) || "No price"
                      : "Price hidden"}
                  </p>
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
                    disabled={index === ordered.length - 1}
                    onClick={() => moveOrdered(index, 1)}
                    className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={item.price == null}
                    onClick={() => revealItem(item.id, !item.priceRevealed)}
                    className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
                    aria-label={
                      item.priceRevealed ? "Hide price" : "Reveal price"
                    }
                  >
                    {item.priceRevealed ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromOrder(item.id)}
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                    aria-label="Remove from list"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <InsertSlot
                hidden={!selectedUnplaced}
                disabled={!selectedUnplaced}
                label={`Insert after ${index + 1}`}
                onInsert={() => insertSelectedAt(index + 1)}
              />
            </div>
          ))}
          {selectedUnplaced && (
            <button
              type="button"
              onClick={() => addToEnd(selectedUnplaced)}
              className="self-start text-sm font-semibold text-sky-400 hover:text-sky-300"
            >
              Add selected to end
            </button>
          )}
        </section>
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

function InsertSlot({
  hidden,
  disabled,
  label,
  onInsert,
}: Readonly<{
  hidden?: boolean;
  disabled: boolean;
  label: string;
  onInsert: () => void;
}>) {
  if (hidden) return null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onInsert}
      className="rounded-lg border border-dashed border-neutral-700 px-3 py-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase hover:border-sky-500 hover:text-sky-300 disabled:cursor-default disabled:opacity-30 disabled:hover:border-neutral-700 disabled:hover:text-neutral-400"
    >
      {label}
    </button>
  );
}
