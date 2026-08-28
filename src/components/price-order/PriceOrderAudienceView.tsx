"use client";

import type { CSSProperties } from "react";
import {
  allPlacedPricesRevealed,
  isPlayerOrderCorrect,
  isPriceOrderComplete,
  priceOrderSlots,
  unplacedPriceOrderItems,
  visiblePriceOrderItems,
  type PriceOrderState,
} from "@/lib/price-order/types";
import { ItemPhoto } from "@/components/price/ItemPhoto";
import { PriceShowStage } from "@/components/price/PriceShowStage";
import { PriceTag } from "@/components/price/PriceTag";
import { usePriceItemLayoutAnimation } from "@/components/price-order/usePriceItemLayoutAnimation";
import "@/styles/price-audience.css";

export function PriceOrderAudienceView({
  game,
}: Readonly<{ game: PriceOrderState }>) {
  const visible = visiblePriceOrderItems(game);
  const shelf = unplacedPriceOrderItems(game);
  const slots = priceOrderSlots(game);
  const slotCount = Math.max(slots.length, 1);
  const showResult =
    isPriceOrderComplete(game) && allPlacedPricesRevealed(game);
  const correct = showResult && isPlayerOrderCorrect(game);
  const layoutKey = `${shelf.map((item) => item.id).join(",")}|${slots
    .map((item) => item?.id ?? "-")
    .join(",")}`;
  const bodyRef = usePriceItemLayoutAnimation(layoutKey);

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
        <div className="price-shelf">
          {shelf.length === 0 ? (
            <p className="price-shelf-empty">All items placed</p>
          ) : (
            shelf.map((item) => (
              <div
                key={item.id}
                className="price-shelf-card"
                data-price-move={item.id}
              >
                <ItemPhoto
                  src={item.imageUrl}
                  alt={item.label || "Item"}
                  fit={item.photoFit}
                />
                <p className="price-item-label">
                  {item.label.trim() || "\u00a0"}
                </p>
              </div>
            ))
          )}
        </div>

        <div
          className="price-order-track"
          style={{ "--price-slots": slotCount } as CSSProperties}
        >
          {Array.from({ length: slotCount }, (_, index) => {
            const item = slots[index];
            return (
              <div
                key={`slot-${index}`}
                className={`price-order-slot${item ? "" : " price-order-slot-empty"}`}
              >
                <span className="price-order-rank">#{index + 1}</span>
                {item ? (
                  <div className="price-order-piece" data-price-move={item.id}>
                    <ItemPhoto
                      src={item.imageUrl}
                      alt={item.label || "Item"}
                      fit={item.photoFit}
                    />
                    <p className="price-item-label">
                      {item.label.trim() || "\u00a0"}
                    </p>
                    <PriceTag
                      price={item.price}
                      revealed={item.priceRevealed}
                    />
                  </div>
                ) : (
                  <div className="price-order-piece">
                    <div className="price-photo-frame">
                      <div className="price-photo-missing">{index + 1}</div>
                    </div>
                    <p className="price-item-label">{"\u00a0"}</p>
                    <div className="price-tag-spacer" aria-hidden />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="price-axis">
          <span>Least</span>
          <span>Most</span>
        </div>
        {showResult && (
          <div className={`price-result-banner${correct ? "" : " wrong"}`}>
            {correct ? "Perfect order" : "Not quite"}
          </div>
        )}
      </div>
    </PriceShowStage>
  );
}
