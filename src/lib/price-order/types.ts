import { uid } from "@/lib/utils";
import { DEFAULT_PHOTO_FIT, type PhotoFit } from "@/lib/price/photo-fit";

export const PRICE_ORDER_MAX_ITEMS = 5;

export type PriceOrderItem = {
  id: string;
  imageUrl: string;
  label: string;
  price: number | null;
  priceRevealed: boolean;
  /** Spectator curtain over the photo. New uploads start closed. */
  itemRevealed: boolean;
  photoFit: PhotoFit;
};

export type PriceOrderState = {
  items: PriceOrderItem[];
  /** On-screen order, left to right. Stays as arranged until the order is revealed. */
  order: string[];
  /** Spectator result overlay. */
  resultShown: boolean;
  /** True after Reveal order, until the board is cleared. */
  answerRevealed: boolean;
  /**
   * Whether the arrangement was correct when it was judged.
   * Null until the operator reveals the order or shows the result.
   * Sorting the board does not change this.
   */
  resultCorrect: boolean | null;
};

export function createDefaultPriceOrderState(): PriceOrderState {
  return {
    items: [],
    order: [],
    resultShown: false,
    resultCorrect: null,
    answerRevealed: false,
  };
}

export function createEmptyPriceOrderItem(): PriceOrderItem {
  return {
    id: uid(),
    imageUrl: "",
    label: "",
    price: null,
    priceRevealed: false,
    itemRevealed: false,
    photoFit: { ...DEFAULT_PHOTO_FIT },
  };
}

export function visiblePriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  return state.items.filter((item) => item.imageUrl);
}

/** On-screen ids, left to right. New photos are appended. Empty slots are dropped. */
export function syncPriceOrder(
  order: ReadonlyArray<string | null | undefined>,
  visible: readonly PriceOrderItem[],
): string[] {
  const visibleIds = new Set(visible.map((item) => item.id));
  const seen = new Set<string>();
  const next: string[] = [];
  for (const entry of order) {
    if (
      typeof entry !== "string" ||
      !entry ||
      !visibleIds.has(entry) ||
      seen.has(entry)
    ) {
      continue;
    }
    seen.add(entry);
    next.push(entry);
  }
  for (const item of visible) {
    if (!seen.has(item.id)) next.push(item.id);
  }
  return next;
}

export function orderedPriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  const visible = visiblePriceOrderItems(state);
  const byId = new Map(visible.map((item) => [item.id, item]));
  return syncPriceOrder(state.order, visible).flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

/** Every card in the operator row, including items that do not have a photo yet. */
export function boardPriceOrderItems(state: PriceOrderState): PriceOrderItem[] {
  const byId = new Map(state.items.map((item) => [item.id, item]));
  return syncPriceOrder(state.order, state.items).flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

/** Every on-screen item has a price, so the answer can be sorted. */
export function priceOrderAnswerReady(state: PriceOrderState): boolean {
  const visible = visiblePriceOrderItems(state);
  return visible.length > 0 && visible.every((item) => item.price != null);
}

export function sortPriceOrderByPrice(
  items: readonly PriceOrderItem[],
): PriceOrderItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aPrice = a.item.price;
      const bPrice = b.item.price;
      if (aPrice == null && bPrice == null) return a.index - b.index;
      if (aPrice == null) return 1;
      if (bPrice == null) return -1;
      if (aPrice !== bPrice) return aPrice - bPrice;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function withSyncedPriceOrderResult(
  state: PriceOrderState,
): PriceOrderState {
  if (visiblePriceOrderItems(state).length === 0) {
    if (!state.resultShown && state.resultCorrect == null && !state.answerRevealed) {
      return state;
    }
    return {
      ...state,
      resultShown: false,
      resultCorrect: null,
      answerRevealed: false,
    };
  }
  if (state.resultShown && state.resultCorrect == null) {
    return { ...state, resultShown: false };
  }
  return state;
}

/** True when placed items are in non-decreasing price order. */
export function isPlayerOrderCorrect(state: PriceOrderState): boolean {
  const ordered = orderedPriceOrderItems(state);
  if (ordered.length < 2) return ordered.length === 1;
  if (ordered.some((item) => item.price == null)) return false;
  for (let i = 1; i < ordered.length; i++) {
    if ((ordered[i].price ?? 0) < (ordered[i - 1].price ?? 0)) return false;
  }
  return true;
}
