import {
  DEFAULT_PHOTO_FIT,
  type PhotoFit,
} from "@/lib/price/photo-fit";
import {
  normalizePriceCatalog,
  type PriceCatalogItem,
} from "@/lib/price/catalog";

export type PriceGuesserResult = "correct" | "wrong";

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
  library: PriceCatalogItem[];
};

export function createDefaultPriceGuesserState(): PriceGuesserState {
  return {
    imageUrl: "",
    label: "",
    price: null,
    priceRevealed: false,
    itemRevealed: true,
    photoFit: { ...DEFAULT_PHOTO_FIT },
    resultOverlay: null,
    library: [],
  };
}

export function normalizePriceGuesserLibrary(raw: unknown): PriceCatalogItem[] {
  return normalizePriceCatalog(raw);
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
