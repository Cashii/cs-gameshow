import {
  DEFAULT_PHOTO_FIT,
  type PhotoFit,
} from "@/lib/price/photo-fit";

export type PriceGuesserResult = "correct" | "wrong";

export type PriceGuesserQueuedItem = {
  id: string;
  imageUrl: string;
  label: string;
  price: number | null;
  photoFit: PhotoFit;
};

export type PriceGuesserState = {
  imageUrl: string;
  label: string;
  price: number | null;
  priceRevealed: boolean;
  /** When false, the spectator photo sits behind a closed curtain. */
  itemRevealed: boolean;
  photoFit: PhotoFit;
  /** Spectator result overlay chosen by the operator. */
  resultOverlay: PriceGuesserResult | null;
  /** Items staged to load onto the desk with Next item. */
  queue: PriceGuesserQueuedItem[];
};

export function createPriceGuesserQueuedItem(
  partial?: Partial<PriceGuesserQueuedItem>,
): PriceGuesserQueuedItem {
  return {
    id: partial?.id || Math.random().toString(36).slice(2, 10),
    imageUrl: partial?.imageUrl ?? "",
    label: partial?.label ?? "",
    price: partial?.price ?? null,
    photoFit: partial?.photoFit
      ? { ...partial.photoFit }
      : { ...DEFAULT_PHOTO_FIT },
  };
}

export function createDefaultPriceGuesserState(): PriceGuesserState {
  return {
    imageUrl: "",
    label: "",
    price: null,
    priceRevealed: false,
    itemRevealed: true,
    photoFit: { ...DEFAULT_PHOTO_FIT },
    resultOverlay: null,
    queue: [],
  };
}

export function parsePriceGuesserResult(
  raw: unknown,
): PriceGuesserResult | null {
  return raw === "correct" || raw === "wrong" ? raw : null;
}

export function withSyncedPriceGuesserResult(
  state: PriceGuesserState,
): PriceGuesserState {
  if (state.resultOverlay && !state.imageUrl) {
    return { ...state, resultOverlay: null };
  }
  return state;
}

/** Desk + queued photo URLs that still count as in use. */
export function priceGuesserImageUrls(
  state: PriceGuesserState | undefined | null,
): string[] {
  if (!state) return [];
  return [
    state.imageUrl,
    ...(state.queue ?? []).map((item) => item.imageUrl),
  ].filter(Boolean);
}

export function liveDeskFromQueuedItem(
  item: PriceGuesserQueuedItem,
): Pick<
  PriceGuesserState,
  | "imageUrl"
  | "label"
  | "price"
  | "photoFit"
  | "priceRevealed"
  | "itemRevealed"
  | "resultOverlay"
> {
  return {
    imageUrl: item.imageUrl,
    label: item.label,
    price: item.price,
    photoFit: { ...item.photoFit },
    priceRevealed: false,
    itemRevealed: false,
    resultOverlay: null,
  };
}

export function advancePriceGuesserFromQueue(
  state: PriceGuesserState,
): PriceGuesserState | null {
  const queue = [...(state.queue ?? [])];
  const next = queue.shift();
  if (!next) return null;
  return withSyncedPriceGuesserResult({
    ...state,
    ...liveDeskFromQueuedItem(next),
    queue,
  });
}
