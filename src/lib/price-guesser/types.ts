import {
  DEFAULT_PHOTO_FIT,
  type PhotoFit,
} from "@/lib/price/photo-fit";

export type PriceGuesserState = {
  imageUrl: string;
  label: string;
  price: number | null;
  priceRevealed: boolean;
  photoFit: PhotoFit;
};

export function createDefaultPriceGuesserState(): PriceGuesserState {
  return {
    imageUrl: "",
    label: "",
    price: null,
    priceRevealed: false,
    photoFit: { ...DEFAULT_PHOTO_FIT },
  };
}
