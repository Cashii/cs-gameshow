import {
  DEFAULT_PHOTO_FIT,
  type PhotoFit,
} from "@/lib/price/photo-fit";

export type PriceGuesserState = {
  imageUrl: string;
  label: string;
  price: number | null;
  priceRevealed: boolean;
  /** When false, the spectator photo sits behind a closed curtain. */
  itemRevealed: boolean;
  photoFit: PhotoFit;
};

export function createDefaultPriceGuesserState(): PriceGuesserState {
  return {
    imageUrl: "",
    label: "",
    price: null,
    priceRevealed: false,
    itemRevealed: true,
    photoFit: { ...DEFAULT_PHOTO_FIT },
  };
}
