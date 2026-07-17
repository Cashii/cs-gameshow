"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultTakeItState,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";
import {
  formatTakeItMoney,
  getPlayerCase,
} from "@/lib/take-it-or-leave-it/logic";
import "@/styles/take-it-audience.css";

function MoneyColumn({
  amounts,
  eliminated,
}: {
  amounts: number[];
  eliminated: Set<number>;
}) {
  return (
    <div className="tioli-money-col">
      {amounts.map((amount, index) => (
        <div
          key={`${amount}-${index}`}
          className={`tioli-money-tile ${eliminated.has(amount) ? "eliminated" : ""}`}
        >
          {formatTakeItMoney(amount)}
        </div>
      ))}
    </div>
  );
}

export function TakeItOrLeaveItAudienceView({
  game: gameProp,
}: Readonly<{ game: TakeItGameState }>) {
  const game = gameProp ?? createDefaultTakeItState();
  const [flashCaseId, setFlashCaseId] = useState<number | null>(null);
  const prevOpenedRef = useRef<number | null>(game.lastOpenedCaseId);

  useEffect(() => {
    if (
      game.lastOpenedCaseId != null &&
      game.lastOpenedCaseId !== prevOpenedRef.current
    ) {
      prevOpenedRef.current = game.lastOpenedCaseId;
      const frame = requestAnimationFrame(() => {
        setFlashCaseId(game.lastOpenedCaseId);
      });
      const timer = window.setTimeout(() => setFlashCaseId(null), 2400);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    prevOpenedRef.current = game.lastOpenedCaseId;
  }, [game.lastOpenedCaseId]);

  const sortedValues = useMemo(
    () => [...(game.values ?? [])].sort((a, b) => a - b),
    [game.values],
  );
  const leftAmounts = sortedValues.slice(0, 5);
  const rightAmounts = sortedValues.slice(5);

  const eliminated = useMemo(() => {
    const set = new Set<number>();
    for (const c of game.cases ?? []) {
      if (c.opened) set.add(c.value);
    }
    return set;
  }, [game.cases]);

  const playerCase = getPlayerCase(game);

  const statusText = (() => {
    if (game.phase === "setup") return "Preparing the cases…";
    if (game.phase === "pick") return "Choose your case";
    if (game.phase === "playing") return "Open a case";
    if (game.phase === "offer") return "Banker is calling…";
    if (game.phase === "final") {
      return game.tookIt ? "Take It!" : "Final case";
    }
    if (game.tookIt) return "Take It!";
    return "Final reveal";
  })();

  return (
    <div className="tioli-audience">
      <MoneyColumn amounts={leftAmounts} eliminated={eliminated} />

      <div className="tioli-center">
        <div className="tioli-title">Take It or Leave It</div>
        <div className="tioli-case-grid">
          {(game.cases?.length
            ? game.cases
            : Array.from({ length: 9 }, (_, i) => ({
                id: i + 1,
                value: 0,
                opened: false,
              }))
          ).map((c) => {
            const isPlayer = c.id === game.playerCaseId;
            return (
              <div
                key={c.id}
                className={[
                  "tioli-case",
                  isPlayer ? "player" : "",
                  c.opened ? "opened" : "",
                  flashCaseId === c.id ? "just-opened" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isPlayer && !c.opened && (
                  <span className="tioli-case-badge">Yours</span>
                )}
                <div className="tioli-suitcase-handle" aria-hidden />
                <div className="tioli-suitcase-shell">
                  <div className="tioli-suitcase-interior">
                    <span className="tioli-case-value">
                      {formatTakeItMoney(c.value)}
                    </span>
                  </div>
                  <div className="tioli-suitcase-lid">
                    <span className="tioli-suitcase-trim" aria-hidden />
                    <span className="tioli-case-number">{c.id}</span>
                    <span className="tioli-suitcase-latch left" aria-hidden />
                    <span className="tioli-suitcase-latch right" aria-hidden />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="tioli-status">{statusText}</div>
      </div>

      <MoneyColumn amounts={rightAmounts} eliminated={eliminated} />

      {game.phase === "offer" && game.offerAmount != null && (
        <div className="tioli-overlay">
          <div className="tioli-offer-card">
            <div className="tioli-offer-label">Banker Offer</div>
            <div className="tioli-offer-amount">
              {formatTakeItMoney(game.offerAmount)}
            </div>
          </div>
        </div>
      )}

      {game.phase === "revealed" && (
        <div className="tioli-overlay">
          <div className="tioli-result-card">
            {game.tookIt && game.offerAmount != null ? (
              <>
                <div className="tioli-result-label">Took the Offer</div>
                <div className="tioli-result-amount">
                  {formatTakeItMoney(game.offerAmount)}
                </div>
                <div className="tioli-result-sub">
                  Case #{game.playerCaseId} held{" "}
                  {playerCase ? formatTakeItMoney(playerCase.value) : "—"}
                </div>
              </>
            ) : (
              <>
                <div className="tioli-result-label">You Win</div>
                <div className="tioli-result-amount">
                  {playerCase ? formatTakeItMoney(playerCase.value) : "—"}
                </div>
                <div className="tioli-result-sub">
                  From case #{game.playerCaseId}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
