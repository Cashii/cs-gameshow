"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import {
  PRICE_ORDER_MAX_ITEMS,
  createDefaultPriceOrderState,
  boardPriceOrderItems,
  createEmptyPriceOrderItem,
  isPlayerOrderCorrect,
  orderedPriceOrderItems,
  priceOrderAnswerReady,
  sortPriceOrderByPrice,
  type PriceOrderItem,
  type PriceOrderState,
} from "@/lib/price-order/types";
import { parsePriceInput, priceInputValue } from "@/lib/price/format";
import { DEFAULT_PHOTO_FIT } from "@/lib/price/photo-fit";
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
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
import { usePriceItemLayoutAnimation } from "@/components/price-order/usePriceItemLayoutAnimation";
import { ResetButton } from "@/components/ui/ResetButton";

export function PriceOrderHostPanel() {
  const { state, setState, updatePriceOrder, updatePriceCatalog } = useSuite();
  const game = state.priceOrder ?? createDefaultPriceOrderState();
  const catalog = state.priceCatalog ?? [];
  const catalogGroups = state.priceCatalogGroups ?? [];
  const { toastMessage, toastTone, showToast } = useToast();
  const spectatorLive = state.spectatorGame === "priceOrder";
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [bankOpenRequest, setBankOpenRequest] = useState(0);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const patch = (updater: (prev: PriceOrderState) => PriceOrderState) => {
    updatePriceOrder(updater);
  };

  const ordered = orderedPriceOrderItems(game);
  const board = boardPriceOrderItems(game);
  const orderKey = board.map((item) => item.id).join(",");
  const orderRowRef = usePriceItemLayoutAnimation(orderKey);
  const visibleItems = ordered;
  const allItemsRevealed =
    visibleItems.length > 0 &&
    visibleItems.every((item) => item.itemRevealed);
  const canAdd = game.items.length < PRICE_ORDER_MAX_ITEMS;
  const answerReady = priceOrderAnswerReady(game);
  const revealDisabled =
    !answerReady || (game.answerRevealed && isPlayerOrderCorrect(game));

  const updateItem = (
    id: string,
    updater: (item: PriceOrderItem) => PriceOrderItem,
    options?: { clearAnswer?: boolean },
  ) => {
    patch((prev) => ({
      ...prev,
      resultShown: options?.clearAnswer ? false : prev.resultShown,
      resultCorrect: options?.clearAnswer ? null : prev.resultCorrect,
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
    const savedUrls = new Set(
      catalog.map((entry) => entry.imageUrl).filter(Boolean),
    );
    if (item?.imageUrl && !savedUrls.has(item.imageUrl)) {
      void deleteMediaByUrl(item.imageUrl);
    }
    patch((prev) => ({
      ...prev,
      items: prev.items.filter((entry) => entry.id !== id),
      resultShown: false,
      resultCorrect: null,
    }));
  };

  const moveOrdered = (index: number, direction: -1 | 1) => {
    patch((prev) => {
      const next = boardPriceOrderItems(prev).map((item) => item.id);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= next.length) return prev;
      const current = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = current;
      return {
        ...prev,
        order: next,
        resultShown: false,
        resultCorrect: null,
      };
    });
  };

  const revealItem = (id: string, revealed: boolean) => {
    updateItem(id, (item) => ({ ...item, priceRevealed: revealed }));
  };

  const revealOrder = () => {
    patch((prev) => {
      if (!priceOrderAnswerReady(prev)) return prev;
      const correct = isPlayerOrderCorrect(prev);
      const sorted = sortPriceOrderByPrice(boardPriceOrderItems(prev));
      return {
        ...prev,
        order: sorted.map((item) => item.id),
        resultCorrect: correct,
        answerRevealed: true,
      };
    });
  };

  const toggleResult = () => {
    patch((prev) => {
      if (prev.resultShown) return { ...prev, resultShown: false };
      if (!priceOrderAnswerReady(prev)) return prev;
      return {
        ...prev,
        resultShown: true,
        resultCorrect: prev.resultCorrect ?? isPlayerOrderCorrect(prev),
      };
    });
  };

  const resultAction = resultButton(
    Boolean(game.resultShown),
    game.resultCorrect,
  );

  const hideAll = () => {
    patch((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, priceRevealed: false })),
    }));
  };

  const liveImageUrls = () => [
    state.priceGuesser?.imageUrl ?? "",
    ...(state.priceGuesser?.queue ?? []).map((item) => item.imageUrl),
    ...(state.priceOrder?.items ?? []).map((item) => item.imageUrl),
  ];

  const reset = () => {
    const savedUrls = new Set(
      catalog.map((entry) => entry.imageUrl).filter(Boolean),
    );
    for (const item of game.items) {
      if (item.imageUrl && !savedUrls.has(item.imageUrl)) {
        void deleteMediaByUrl(item.imageUrl);
      }
    }
    patch(() => createDefaultPriceOrderState());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          <div className="inline-flex h-10 items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={allItemsRevealed}
              aria-label="Toggle all item curtains"
              disabled={visibleItems.length === 0}
              onClick={() =>
                patch((prev) => ({
                  ...prev,
                  items: allItemsRevealed
                    ? prev.items.map((item) => ({
                        ...item,
                        itemRevealed: false,
                      }))
                    : prev.items.map((item) =>
                        item.imageUrl ? { ...item, itemRevealed: true } : item,
                      ),
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                allItemsRevealed ? "bg-emerald-500" : "bg-neutral-500"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  allItemsRevealed ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-semibold ${
                allItemsRevealed ? "text-emerald-400" : "text-neutral-300"
              }`}
            >
              {allItemsRevealed ? "Items revealed" : "Curtains closed"}
            </span>
          </div>
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
            disabled={revealDisabled}
            onClick={revealOrder}
            className="inline-flex h-10 items-center rounded-md border border-amber-400 bg-amber-500 px-4 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            Reveal order
          </button>
          <button
            type="button"
            disabled={
              !game.resultShown && game.resultCorrect == null && !answerReady
            }
            onClick={toggleResult}
            className={`inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500 ${resultAction.className}`}
          >
            {resultAction.label}
          </button>
          <ResetButton onClick={() => setConfirmReset(true)}>
            Reset Game
          </ResetButton>
          <div className="ml-auto">
            <PriceItemLibrary
              items={catalog}
              groups={catalogGroups}
              openRequest={bankOpenRequest}
              saveLabel="Save all items"
              saveDisabled={
                !game.items.some(
                  (item) =>
                    item.imageUrl || item.label.trim() || item.price != null,
                )
              }
              loadDisabled={game.items.length >= PRICE_ORDER_MAX_ITEMS}
              pickHint="Pick one to add it to the board, up to five."
              onSave={async (groupId) => {
                const seen = new Set(catalog.map(priceCatalogKey));
                const incoming: PriceCatalogItem[] = [];
                for (const item of game.items) {
                  if (
                    !item.imageUrl &&
                    !item.label.trim() &&
                    item.price == null
                  ) {
                    continue;
                  }
                  const draft: PriceCatalogItem = {
                    id: "draft",
                    imageUrl: item.imageUrl,
                    label: item.label,
                    price: item.price,
                    photoFit: item.photoFit,
                    groupId,
                  };
                  const key = priceCatalogKey(draft);
                  if (seen.has(key)) continue;
                  seen.add(key);
                  incoming.push({
                    ...draft,
                    id: uid(),
                    imageUrl: item.imageUrl
                      ? await copyMediaUrl(item.imageUrl)
                      : "",
                  });
                }
                if (incoming.length === 0) return;
                updatePriceCatalog((items) =>
                  mergePriceCatalog(items, incoming),
                );
              }}
              onLoad={async (id) => {
                const entry = catalog.find((item) => item.id === id);
                if (!entry || game.items.length >= PRICE_ORDER_MAX_ITEMS) {
                  return;
                }
                const imageUrl = entry.imageUrl
                  ? await copyMediaUrl(entry.imageUrl)
                  : "";
                const next: PriceOrderItem = {
                  id: uid(),
                  imageUrl,
                  label: entry.label,
                  price: entry.price,
                  photoFit: entry.photoFit,
                  priceRevealed: false,
                  itemRevealed: false,
                };
                updatePriceOrder((prev) => {
                  if (prev.items.length >= PRICE_ORDER_MAX_ITEMS) {
                    if (imageUrl) void deleteMediaByUrl(imageUrl);
                    return prev;
                  }
                  return {
                    ...prev,
                    items: [...prev.items, next],
                    resultShown: false,
                    resultCorrect: null,
                  };
                });
              }}
              onDelete={(id) => {
                const entry = catalog.find((item) => item.id === id);
                updatePriceCatalog((items) =>
                  items.filter((item) => item.id !== id),
                );
                const url = entry?.imageUrl;
                if (
                  !url ||
                  priceImageStillUsed(url, catalog, id, liveImageUrls())
                ) {
                  return;
                }
                void deleteMediaByUrl(url);
              }}
              onGroupsApply={(next) =>
                setState((prev) => ({
                  ...prev,
                  priceCatalog: next.items,
                  priceCatalogGroups: next.groups,
                }))
              }
            />
          </div>
        </div>
      </div>
      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Price Order. Use the Spectator screen list so the
          projector shows the items.
        </SpectatorScreenNotice>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full flex-col gap-3 px-6 py-6">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            On display ({board.length}/{PRICE_ORDER_MAX_ITEMS})
          </h3>
          <div
            ref={orderRowRef}
            className="flex items-stretch gap-3 overflow-x-auto pb-1"
          >
            {board.map((item, index) => (
              <article
                key={item.id}
                data-price-move={item.id}
                className="relative flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-amber-300">
                    {index + 1}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveOrdered(index, -1)}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-neutral-200 hover:bg-neutral-800 disabled:opacity-30"
                      aria-label="Move left"
                    >
                      <ChevronLeft size={28} />
                    </button>
                    <button
                      type="button"
                      disabled={index === board.length - 1}
                      onClick={() => moveOrdered(index, 1)}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-neutral-200 hover:bg-neutral-800 disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <ChevronRight size={28} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(item.id)}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 size={22} />
                    </button>
                  </div>
                </div>
                <SquarePhotoEditor
                  imageUrl={item.imageUrl}
                  fit={item.photoFit ?? DEFAULT_PHOTO_FIT}
                  onUploaded={(url) =>
                    updateItem(
                      item.id,
                      (prev) => ({
                        ...prev,
                        imageUrl: url,
                        priceRevealed: false,
                        itemRevealed: false,
                        photoFit: { ...DEFAULT_PHOTO_FIT },
                      }),
                      { clearAnswer: true },
                    )
                  }
                  onFitChange={(photoFit) =>
                    updateItem(item.id, (prev) => ({ ...prev, photoFit }))
                  }
                  onError={(message) => showToast(message, "error")}
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
                  className="h-8 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceDrafts[item.id] ?? priceInputValue(item.price)}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPriceDrafts((drafts) => ({
                      ...drafts,
                      [item.id]: next,
                    }));
                    updateItem(
                      item.id,
                      (prev) => ({
                        ...prev,
                        price: parsePriceInput(next),
                        priceRevealed: false,
                      }),
                      { clearAnswer: true },
                    );
                  }}
                  placeholder="Price"
                  className="h-8 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
                <StatusSwitch
                  size="lg"
                  checked={item.itemRevealed}
                  disabled={!item.imageUrl}
                  labelOn="Curtain open"
                  labelOff="Curtain closed"
                  ariaLabel={`${item.label.trim() || "Item"} curtain`}
                  onToggle={() =>
                    updateItem(item.id, (prev) => ({
                      ...prev,
                      itemRevealed: !prev.itemRevealed,
                    }))
                  }
                />
                <StatusSwitch
                  size="lg"
                  checked={item.priceRevealed}
                  disabled={item.price == null}
                  labelOn="Price showing"
                  labelOff="Price hidden"
                  ariaLabel={`${item.label.trim() || "Item"} price`}
                  onToggle={() => revealItem(item.id, !item.priceRevealed)}
                />
              </article>
            ))}
            {canAdd ? (
              <div className="flex min-h-72 w-72 shrink-0 flex-col items-center justify-center gap-4 self-stretch rounded-xl border border-dashed border-neutral-600 bg-neutral-950 px-4 py-8">
                <button
                  type="button"
                  onClick={addItem}
                  className="flex flex-col items-center gap-3 text-neutral-300 hover:text-sky-200"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-current">
                    <Plus size={22} />
                  </span>
                  <span className="text-sm font-semibold">Add item</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBankOpenRequest((current) => current + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
                >
                  <FolderOpen size={14} />
                  Load saved item
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Toast message={toastMessage} tone={toastTone} />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Price Order?"
        message="This removes every item and photo from the spectator screen."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={reset}
      />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Remove this item?"
        message={
          pendingDeleteId
            ? `Remove ${
                game.items.find((item) => item.id === pendingDeleteId)?.label.trim() ||
                "this item"
              } from the desk?`
            : "Remove this item from the desk?"
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) removeItem(pendingDeleteId);
        }}
      />
    </div>
  );
}

function resultButton(
  shown: boolean,
  correct: boolean | null,
): { label: string; className: string } {
  if (shown) {
    return {
      label: "Hide result",
      className: "border-teal-500 bg-teal-600 hover:bg-teal-500",
    };
  }
  if (correct === true) {
    return {
      label: "Show Perfect order",
      className: "border-green-500 bg-green-600 hover:bg-green-700",
    };
  }
  if (correct === false) {
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
