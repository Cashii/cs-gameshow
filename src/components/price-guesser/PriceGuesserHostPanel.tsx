"use client";

import { FolderOpen, ListPlus, SkipForward, Trash2 } from "lucide-react";
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
import { parsePriceInput, priceInputValue } from "@/lib/price/format";
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
import { usePriceItemLayoutAnimation } from "@/components/price-order/usePriceItemLayoutAnimation";
import { StatusSwitch } from "@/components/operator/StatusSwitch";
import { useEffect, useRef, useState } from "react";

export function PriceGuesserHostPanel() {
  const { state, setState, updatePriceGuesser, updatePriceCatalog } = useSuite();
  const game = state.priceGuesser ?? createDefaultPriceGuesserState();
  const catalog = state.priceCatalog ?? [];
  const catalogGroups = state.priceCatalogGroups ?? [];
  const queue = game.queue ?? [];
  const queueOrderKey = queue.map((item) => item.id).join(",");
  const queueListRef = usePriceItemLayoutAnimation<HTMLUListElement>(queueOrderKey);
  const { toastMessage, toastTone, showToast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [bankOpenRequest, setBankOpenRequest] = useState(0);
  const [priceText, setPriceText] = useState(() => priceInputValue(game.price));
  const priceFocusedRef = useRef(false);

  useEffect(() => {
    // While typing, keep the raw draft (e.g. "84.9") — rewriting from the
    // parsed number pads ".90" and fights the second decimal digit.
    if (priceFocusedRef.current) return;
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
      <PriceItemLibrary
        items={catalog}
        groups={catalogGroups}
        openRequest={bankOpenRequest}
        showTrigger={false}
        closeOnLoad
        saveLabel="Save this item"
        saveDisabled={
          !game.imageUrl && !game.label.trim() && game.price == null
        }
        pickHint="Click an item to put it on the desk, or Queue to stage it for later. The curtain starts closed."
        onSave={async (groupId) => {
          const draft: PriceCatalogItem = {
            id: "draft",
            imageUrl: game.imageUrl,
            label: game.label,
            price: game.price,
            photoFit: game.photoFit,
            groupId,
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
        onGroupsApply={(next) =>
          setState((prev) => ({
            ...prev,
            priceCatalog: next.items,
            priceCatalogGroups: next.groups,
          }))
        }
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-full justify-center px-6 py-6">
          <div className="flex max-w-full flex-nowrap items-start gap-6 overflow-x-auto">
            <div className="flex w-72 shrink-0 flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Current Item
              </h3>
              <button
                type="button"
                onClick={() => setBankOpenRequest((current) => current + 1)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-500 bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-500"
              >
                <FolderOpen size={16} />
                Load saved item
              </button>
              <div className="relative">
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
                  onError={(message) => showToast(message, "error")}
                />
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  aria-label="Clear item"
                  title="Clear item"
                  className="absolute top-1.5 right-1.5 z-20 rounded-md bg-neutral-950/80 p-1.5 text-white hover:bg-neutral-950 hover:text-white"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={queue.length === 0}
                  onClick={loadNextFromQueue}
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-teal-500 bg-teal-600 px-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
                >
                  <SkipForward size={16} />
                  Next item
                  {queue.length > 0 ? ` (${queue.length})` : ""}
                </button>
                <button
                  type="button"
                  disabled={!canQueueCurrent}
                  onClick={() => void queueCurrentDesk()}
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-teal-500 bg-transparent px-2 text-sm font-semibold text-teal-300 hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ListPlus size={16} />
                  Queue current
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price-guesser-name"
                  className="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                >
                  Item name (optional)
                </label>
                <input
                  id="price-guesser-name"
                  type="text"
                  value={game.label}
                  onChange={(event) =>
                    patch((prev) => ({ ...prev, label: event.target.value }))
                  }
                  placeholder="Espresso machine"
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price-guesser-price"
                  className="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                >
                  Price
                </label>
                <input
                  id="price-guesser-price"
                  type="text"
                  inputMode="decimal"
                  value={priceText}
                  onFocus={() => {
                    priceFocusedRef.current = true;
                  }}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPriceText(next);
                    patch((prev) => ({
                      ...prev,
                      price: parsePriceInput(next),
                      priceRevealed: false,
                    }));
                  }}
                  onBlur={(event) => {
                    priceFocusedRef.current = false;
                    const parsed = parsePriceInput(event.target.value);
                    setPriceText(priceInputValue(parsed));
                    patch((prev) => ({
                      ...prev,
                      price: parsed,
                      priceRevealed: false,
                    }));
                  }}
                  placeholder="49.99"
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <StatusSwitch
                size="lg"
                checked={itemShowing}
                disabled={!game.imageUrl}
                labelOn="Curtain open"
                labelOff="Curtain closed"
                ariaLabel="Toggle curtain"
                onToggle={() =>
                  patch((prev) => ({
                    ...prev,
                    itemRevealed: !prev.itemRevealed,
                  }))
                }
              />
              <StatusSwitch
                size="lg"
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

            <section className="w-[36rem] max-w-2xl shrink-0">
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Overlays
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!hasItem && game.resultOverlay !== "correct"}
                    onClick={() => toggleResult("correct")}
                    className={`inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-transparent disabled:text-neutral-500 ${
                      game.resultOverlay === "correct"
                        ? "border-teal-500 bg-teal-600 text-white hover:bg-teal-500"
                        : "border-green-500 bg-transparent text-green-300 hover:bg-green-500/10"
                    }`}
                  >
                    {game.resultOverlay === "correct"
                      ? "Hide result"
                      : "Show Correct"}
                  </button>
                  <button
                    type="button"
                    disabled={!hasItem && game.resultOverlay !== "wrong"}
                    onClick={() => toggleResult("wrong")}
                    className={`inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-transparent disabled:text-neutral-500 ${
                      game.resultOverlay === "wrong"
                        ? "border-teal-500 bg-teal-600 text-white hover:bg-teal-500"
                        : "border-red-500 bg-transparent text-red-300 hover:bg-red-500/10"
                    }`}
                  >
                    {game.resultOverlay === "wrong"
                      ? "Hide result"
                      : "Show Not quite"}
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Upcoming items ({queue.length})
                </h3>
              </div>
              <div className="space-y-2">
                {queue.length > 0 ? (
                  <p className="text-sm text-neutral-500">
                    Edit name or price, or use the arrows to reorder. Top item
                    plays next.
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Stage items here from the bank, or queue the current desk
                    item.{" "}
                    <span className="font-semibold text-neutral-400">
                      Next item
                    </span>{" "}
                    loads the first one onto the desk with the curtain closed.
                  </p>
                )}
                <ul ref={queueListRef} className="flex flex-col gap-2">
                  {queue.map((item, index) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      index={index}
                      canMoveUp={index > 0}
                      canMoveDown={index < queue.length - 1}
                      onMoveUp={() => moveQueueItem(index, -1)}
                      onMoveDown={() => moveQueueItem(index, 1)}
                      onUpdate={(patch) => {
                        setQueue(
                          queue.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, ...patch }
                              : entry,
                          ),
                        );
                      }}
                      onRemove={() => {
                        setQueue(
                          queue.filter((entry) => entry.id !== item.id),
                          [item.imageUrl],
                        );
                      }}
                    />
                  ))}
                  <li className="flex min-h-24 max-w-2xl items-center justify-center rounded-xl border border-dashed border-neutral-600 bg-neutral-950/60 px-4 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        setBankOpenRequest((current) => current + 1)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                      <FolderOpen size={14} />
                      Load saved item
                    </button>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} tone={toastTone} />
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
  onUpdate,
  onRemove,
}: Readonly<{
  item: PriceGuesserQueuedItem;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (patch: Partial<PriceGuesserQueuedItem>) => void;
  onRemove: () => void;
}>) {
  const name = item.label.trim() || "Untitled item";
  const [priceText, setPriceText] = useState(() => priceInputValue(item.price));
  const priceFocusedRef = useRef(false);

  useEffect(() => {
    if (priceFocusedRef.current) return;
    setPriceText(priceInputValue(item.price));
  }, [item.price]);

  return (
    <li
      data-price-move={item.id}
      className="relative grid max-w-2xl grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] items-stretch gap-2 rounded-xl border border-neutral-700 bg-neutral-800/70 p-2"
    >
      <QueueMoveControls
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        label="item"
      />
      <span className="flex w-10 items-center justify-center self-center text-lg font-bold text-neutral-400">
        {index + 1}
      </span>
      <span className="relative aspect-square h-full w-auto justify-self-start overflow-hidden rounded-lg bg-neutral-950">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full"
            style={photoFitStyle(item.photoFit)}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-xs text-neutral-500">
            No photo
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-col justify-center gap-1.5 py-1">
        <input
          type="text"
          value={item.label}
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="Item name (optional)"
          aria-label={`${name} name`}
          className="h-9 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
        />
        <input
          type="text"
          inputMode="decimal"
          value={priceText}
          onFocus={() => {
            priceFocusedRef.current = true;
          }}
          onChange={(event) => {
            const next = event.target.value;
            setPriceText(next);
            onUpdate({ price: parsePriceInput(next) });
          }}
          onBlur={(event) => {
            priceFocusedRef.current = false;
            const parsed = parsePriceInput(event.target.value);
            setPriceText(priceInputValue(parsed));
            onUpdate({ price: parsed });
          }}
          placeholder="Price"
          aria-label={`${name} price`}
          className="h-9 w-full max-w-40 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
        />
        {index === 0 ? (
          <p className="text-xs font-semibold text-sky-400">Plays next</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-14 w-14 self-center items-center justify-center rounded-xl border border-neutral-600 bg-neutral-900 text-neutral-300 hover:border-red-500 hover:text-red-300"
        aria-label={`Remove ${name} from queue`}
      >
        <Trash2 size={22} />
      </button>
    </li>
  );
}
