import { uid } from "@/lib/utils";
import {
  DEFAULT_PHOTO_FIT,
  type PhotoFit,
} from "@/lib/price/photo-fit";

export const PRICE_ORDER_MAX_ITEMS = 5;

export type PriceOrderItem = {
  id: string;
  imageUrl: string;
  label: string;
  price: number | null;
  priceRevealed: boolean;
  photoFit: PhotoFit;
};

export type PriceOrderState = {
  items: PriceOrderItem[];
  /** Slot ids from cheapest to most expensive. `null` is an empty slot. */
  order: Array<string | null>;
};

export function createDefaultPriceOrderState(): PriceOrderState {
  return { items: [], order: [] };
}

export function createEmptyPriceOrderItem(): PriceOrderItem {
  return {
    id: uid(),
    imageUrl: "",
    label: "",
    price: null,
    priceRevealed: false,
    photoFit: { ...DEFAULT_PHOTO_FIT },
  };
}

export function visiblePriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  return state.items.filter((item) => item.imageUrl);
}

export function syncPriceOrderSlots(
  order: ReadonlyArray<string | null | undefined>,
  visible: readonly PriceOrderItem[],
): Array<string | null> {
  const visibleIds = new Set(visible.map((item) => item.id));
  const seen = new Set<string>();
  const slots: Array<string | null> = [];
  for (const entry of order) {
    if (
      typeof entry !== "string" ||
      !entry ||
      !visibleIds.has(entry) ||
      seen.has(entry)
    ) {
      slots.push(null);
      continue;
    }
    seen.add(entry);
    slots.push(entry);
  }
  while (slots.length < visible.length) slots.push(null);
  while (slots.length > visible.length) {
    const emptyAt = slots.lastIndexOf(null);
    if (emptyAt >= 0) slots.splice(emptyAt, 1);
    else slots.pop();
  }
  return slots;
}

export function placedPriceOrderIds(state: PriceOrderState): Set<string> {
  const ids = new Set<string>();
  for (const id of state.order) {
    if (id) ids.add(id);
  }
  return ids;
}

export function unplacedPriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  const placed = placedPriceOrderIds(state);
  return visiblePriceOrderItems(state).filter((item) => !placed.has(item.id));
}

export function priceOrderSlots(
  state: PriceOrderState,
): Array<PriceOrderItem | null> {
  const visible = visiblePriceOrderItems(state);
  const byId = new Map(visible.map((item) => [item.id, item]));
  return syncPriceOrderSlots(state.order, visible).map((id) =>
    id ? (byId.get(id) ?? null) : null,
  );
}

export function orderedPriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  return priceOrderSlots(state).filter(
    (item): item is PriceOrderItem => item != null,
  );
}

export function isPriceOrderComplete(state: PriceOrderState): boolean {
  const slots = priceOrderSlots(state);
  return slots.length > 0 && slots.every((item) => item != null);
}

export function allPlacedPricesRevealed(state: PriceOrderState): boolean {
  const ordered = orderedPriceOrderItems(state);
  return ordered.length > 0 && ordered.every((item) => item.priceRevealed);
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
