"use client";

import type { CSSProperties } from "react";
import {
  orderedPriceOrderItems,
  visiblePriceOrderItems,
  type PriceOrderItem,
  type PriceOrderState,
} from "@/lib/price-order/types";
import { ItemCurtain } from "@/components/price/ItemCurtain";
import { ItemPhoto } from "@/components/price/ItemPhoto";
import { PriceShowStage } from "@/components/price/PriceShowStage";
import { PriceTag } from "@/components/price/PriceTag";
import { PriceResultOverlay } from "@/components/price/PriceResultOverlay";
import { usePriceItemLayoutAnimation } from "@/components/price-order/usePriceItemLayoutAnimation";
import "@/styles/price-audience.css";

function CurtainedItem({
  item,
}: Readonly<{
  item: PriceOrderItem;
}>) {
  const itemRevealed = item.itemRevealed !== false;
  const label = item.label.trim();
  return (
    <div
      className="price-curtain-stage price-order-curtain-stage"
      aria-label={
        itemRevealed ? label || "Item" : "Item hidden behind curtain"
      }
    >
      <div className="price-order-photo-wrap">
        <ItemPhoto
          src={item.imageUrl}
          alt={itemRevealed ? label || "Item" : ""}
          fit={item.photoFit}
        />
      </div>
      <p className="price-item-label">{label || "\u00a0"}</p>
      <ItemCurtain open={itemRevealed} />
    </div>
  );
}

export function PriceOrderAudienceView({
  game,
}: Readonly<{ game: PriceOrderState }>) {
  const visible = visiblePriceOrderItems(game);
  const ordered = orderedPriceOrderItems(game);
  const layoutKey = ordered.map((item) => item.id).join(",");
  const bodyRef = usePriceItemLayoutAnimation(layoutKey);
  const resultCorrect = game.resultCorrect === true;

  if (visible.length === 0) {
    return (
      <PriceShowStage>
        <p className="price-empty">Waiting for items</p>
      </PriceShowStage>
    );
  }

  return (
    <PriceShowStage>
      <p className="price-subtitle">Cheapest to most expensive</p>
      <div className="price-order-body" ref={bodyRef}>
        <div
          className="price-order-track"
          style={{ "--price-slots": ordered.length } as CSSProperties}
        >
          {ordered.map((item, index) => (
            <div key={`slot-${index}`} className="price-order-slot">
              <span className="price-order-rank">#{index + 1}</span>
              <div className="price-order-piece" data-price-move={item.id}>
                <div className="price-order-stack">
                  <CurtainedItem item={item} />
                  <PriceTag price={item.price} revealed={item.priceRevealed} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="price-axis">
          <span>Least</span>
          <span>Most</span>
        </div>
      </div>
      {game.resultShown && game.resultCorrect != null && (
        <PriceResultOverlay
          key={resultCorrect ? "win" : "lose"}
          correct={resultCorrect}
          message={resultCorrect ? "Perfect order" : "Not quite"}
        />
      )}
    </PriceShowStage>
  );
}
