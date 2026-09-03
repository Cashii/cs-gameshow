"use client";

import type { PriceGuesserState } from "@/lib/price-guesser/types";
import { ItemCurtain } from "@/components/price/ItemCurtain";
import { ItemPhoto } from "@/components/price/ItemPhoto";
import { PriceShowStage } from "@/components/price/PriceShowStage";
import { PriceTag } from "@/components/price/PriceTag";
import { PriceResultOverlay } from "@/components/price/PriceResultOverlay";
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

  const itemRevealed = game.itemRevealed !== false;
  const label = game.label.trim();

  return (
    <PriceShowStage>
      <div className="price-guesser-body">
        <div
          className="price-curtain-stage"
          aria-label={itemRevealed ? label || "Item" : "Item hidden behind curtain"}
        >
          <ItemPhoto
            src={game.imageUrl}
            alt={itemRevealed ? label || "Item" : ""}
            fit={game.photoFit}
          />
          {label ? <p className="price-item-label">{label}</p> : null}
          <ItemCurtain open={itemRevealed} />
        </div>
        <PriceTag
          price={game.price}
          revealed={game.priceRevealed}
          size="xl"
        />
      </div>
      {game.resultOverlay && (
        <PriceResultOverlay
          key={game.resultOverlay}
          correct={game.resultOverlay === "correct"}
          message={
            game.resultOverlay === "correct" ? "Correct" : "Not quite"
          }
        />
      )}
    </PriceShowStage>
  );
}
