"use client";

import type { CSSProperties } from "react";
import {
  allPlacedPricesRevealed,
  isPlayerOrderCorrect,
  isPriceOrderComplete,
  orderedPriceOrderItems,
  unplacedPriceOrderItems,
  visiblePriceOrderItems,
  type PriceOrderState,
} from "@/lib/price-order/types";
import { ItemPhoto } from "@/components/price/ItemPhoto";
import { PriceTag } from "@/components/price/PriceTag";
import "@/styles/price-audience.css";

export function PriceOrderAudienceView({
  game,
}: Readonly<{ game: PriceOrderState }>) {
  const visible = visiblePriceOrderItems(game);
  const shelf = unplacedPriceOrderItems(game);
  const ordered = orderedPriceOrderItems(game);
  const slotCount = Math.max(visible.length, 1);
  const showResult =
    isPriceOrderComplete(game) && allPlacedPricesRevealed(game);
  const correct = showResult && isPlayerOrderCorrect(game);

  if (visible.length === 0) {
    return (
      <div className="price-stage">
        <div className="price-stage-glow" aria-hidden />
        <h1 className="price-title">Price Order</h1>
        <p className="price-empty">Waiting for items</p>
      </div>
    );
  }

  return (
    <div className="price-stage">
      <div className="price-stage-glow" aria-hidden />
      <h1 className="price-title">Price Order</h1>
      <p className="price-subtitle">Cheapest to most expensive</p>
      <div className="price-order-body">
        <div className="price-shelf">
          {shelf.length === 0 ? (
            <p className="price-shelf-empty">All items placed</p>
          ) : (
            shelf.map((item) => (
              <div key={item.id} className="price-shelf-card">
                <ItemPhoto src={item.imageUrl} alt={item.label || "Item"} />
                {item.label.trim() ? (
                  <p className="price-item-label">{item.label.trim()}</p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div
          className="price-order-track"
          style={{ "--price-slots": slotCount } as CSSProperties}
        >
          {Array.from({ length: slotCount }, (_, index) => {
            const item = ordered[index];
            return (
              <div
                key={item?.id ?? `slot-${index}`}
                className={`price-order-slot${item ? "" : " price-order-slot-empty"}`}
              >
                <span className="price-order-rank">#{index + 1}</span>
                {item ? (
                  <>
                    <ItemPhoto src={item.imageUrl} alt={item.label || "Item"} />
                    {item.label.trim() ? (
                      <p className="price-item-label">{item.label.trim()}</p>
                    ) : null}
                    <PriceTag
                      price={item.price}
                      revealed={item.priceRevealed}
                    />
                  </>
                ) : (
                  <div className="price-photo-frame">
                    <div className="price-photo-missing">{index + 1}</div>
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
    </div>
  );
}
