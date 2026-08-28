"use client";

import type { PriceGuesserState } from "@/lib/price-guesser/types";
import { ItemPhoto } from "@/components/price/ItemPhoto";
import { PriceTag } from "@/components/price/PriceTag";
import "@/styles/price-audience.css";

export function PriceGuesserAudienceView({
  game,
}: Readonly<{ game: PriceGuesserState }>) {
  if (!game.imageUrl) {
    return (
      <div className="price-stage">
        <div className="price-stage-glow" aria-hidden />
        <h1 className="price-title">Price Guesser</h1>
        <p className="price-empty">Waiting for the next item</p>
      </div>
    );
  }

  return (
    <div className="price-stage">
      <div className="price-stage-glow" aria-hidden />
      <h1 className="price-title">Price Guesser</h1>
      <div className="price-guesser-body">
        <ItemPhoto src={game.imageUrl} alt={game.label || "Item"} />
        {game.label.trim() ? (
          <p className="price-item-label">{game.label.trim()}</p>
        ) : null}
        <PriceTag
          price={game.price}
          revealed={game.priceRevealed}
          size="lg"
        />
      </div>
    </div>
  );
}
