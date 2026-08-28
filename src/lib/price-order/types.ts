import { uid } from "@/lib/utils";

export const PRICE_ORDER_MAX_ITEMS = 5;

export type PriceOrderItem = {
  id: string;
  imageUrl: string;
  label: string;
  price: number | null;
  priceRevealed: boolean;
};

export type PriceOrderState = {
  items: PriceOrderItem[];
  /** Item ids from cheapest to most expensive, as the player called them. */
  order: string[];
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
  };
}

export function visiblePriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  return state.items.filter((item) => item.imageUrl);
}

export function unplacedPriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  const placed = new Set(state.order);
  return visiblePriceOrderItems(state).filter((item) => !placed.has(item.id));
}

export function orderedPriceOrderItems(
  state: PriceOrderState,
): PriceOrderItem[] {
  const byId = new Map(state.items.map((item) => [item.id, item]));
  return state.order
    .map((id) => byId.get(id))
    .filter((item): item is PriceOrderItem => !!item && !!item.imageUrl);
}

export function isPriceOrderComplete(state: PriceOrderState): boolean {
  const visible = visiblePriceOrderItems(state);
  return visible.length > 0 && state.order.length === visible.length;
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
