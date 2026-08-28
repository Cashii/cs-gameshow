"use client";

import type { PriceGuesserState } from "@/lib/price-guesser/types";
import { ItemPhoto } from "@/components/price/ItemPhoto";
import { PriceShowStage } from "@/components/price/PriceShowStage";
import { PriceTag } from "@/components/price/PriceTag";
import "@/styles/price-audience.css";

export function PriceGuesserAudienceView({
  game,
}: Readonly<{ game: PriceGuesserState }>) {
  if (!game.imageUrl) {
    return (
      <PriceShowStage>
        <p className="price-empty">Waiting for the next item</p>
      </PriceShowStage>
    );
  }

  return (
    <PriceShowStage>
      <div className="price-guesser-body">
        <ItemPhoto
          src={game.imageUrl}
          alt={game.label || "Item"}
          fit={game.photoFit}
        />
        {game.label.trim() ? (
          <p className="price-item-label">{game.label.trim()}</p>
        ) : null}
        <PriceTag
          price={game.price}
          revealed={game.priceRevealed}
          size="xl"
        />
      </div>
    </PriceShowStage>
  );
}
