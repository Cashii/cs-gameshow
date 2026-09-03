"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  createDefaultTakeItState,
  takeItCardLabel,
  takeItGridColumns,
  type TakeItCard,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import "@/styles/take-it-audience.css";

function CardFace({ card }: Readonly<{ card: TakeItCard }>) {
  return (
    <span className={`tioli-card-face tioli-card-${card}`}>
      <span className="tioli-card-title">
        {card === "green" ? "Green" : "Red"}
      </span>
      <span className="tioli-card-sub">{takeItCardLabel(card)}</span>
    </span>
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
      const timer = window.setTimeout(() => setFlashCaseId(null), 3400);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    prevOpenedRef.current = game.lastOpenedCaseId;
  }, [game.lastOpenedCaseId]);

  const joinQrActive = game.phase === "setup" || game.phase === "pick";
  const [joinQrMounted, setJoinQrMounted] = useState(joinQrActive);
  const [joinQrVisible, setJoinQrVisible] = useState(joinQrActive);

  useEffect(() => {
    if (joinQrActive) {
      setJoinQrMounted(true);
      const frame = requestAnimationFrame(() => setJoinQrVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setJoinQrVisible(false);
    const timer = window.setTimeout(() => setJoinQrMounted(false), 400);
    return () => clearTimeout(timer);
  }, [joinQrActive]);

  const featuredCase = game.cases.find((c) => c.id === flashCaseId);
  const caseCount = game.cases?.length || game.cards?.length || 9;
  const columns = takeItGridColumns(caseCount);

  const statusText = (() => {
    if (game.phase === "setup") return "Preparing the cases…";
    if (game.phase === "pick") return "Choose your case on your phone";
    return "Opening cases";
  })();

  const placeholderCases = Array.from({ length: caseCount }, (_, i) => ({
    id: i + 1,
    card: "green" as const,
    opened: false,
  }));

  return (
    <div className="tioli-audience tioli-audience-cards">
      <div className="tioli-center">
        <div
          className="tioli-case-grid"
          style={{ "--tioli-cols": columns } as CSSProperties}
        >
          {(game.cases?.length ? game.cases : placeholderCases).map((c) => {
            const claimed = (game.pickCounts?.[String(c.id)] ?? 0) > 0;
            return (
              <div
                key={c.id}
                className={[
                  "tioli-case",
                  claimed && !c.opened ? "claimed" : "",
                  c.opened ? "opened" : "",
                  c.opened ? `tioli-case-${c.card}` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {claimed && !c.opened && (
                  <span className="tioli-case-badge">Picked</span>
                )}
                <div className="tioli-suitcase-handle" aria-hidden />
                <div className="tioli-suitcase-shell">
                  <div className="tioli-suitcase-interior">
                    {c.opened ? <CardFace card={c.card} /> : null}
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

      {featuredCase && (
        <div className="tioli-case-feature" aria-hidden>
          <div
            className={`tioli-case tioli-case-featured opened just-opened tioli-case-${featuredCase.card}`}
            style={
              {
                "--tioli-feature-x": `${
                  (((featuredCase.id - 1) % columns) - (columns - 1) / 2) * 22
                }vw`,
                "--tioli-feature-y": `${
                  (Math.floor((featuredCase.id - 1) / columns) -
                    Math.floor((caseCount - 1) / columns) / 2) *
                  18
                }vh`,
              } as CSSProperties
            }
          >
            <div className="tioli-suitcase-handle" />
            <div className="tioli-suitcase-shell">
              <div className="tioli-suitcase-interior">
                <CardFace card={featuredCase.card} />
              </div>
              <div className="tioli-suitcase-lid">
                <span className="tioli-suitcase-trim" />
                <span className="tioli-case-number">{featuredCase.id}</span>
                <span className="tioli-suitcase-latch left" />
                <span className="tioli-suitcase-latch right" />
              </div>
            </div>
          </div>
        </div>
      )}

      {joinQrMounted ? (
        <div
          className={`tioli-join-qr-overlay absolute inset-0 z-20 flex items-center justify-center pointer-events-none ${
            joinQrVisible ? "is-visible" : "is-hidden"
          }`}
          aria-hidden={!joinQrVisible}
        >
          <div className="tioli-join-qr-backdrop absolute inset-0 bg-neutral-950/55 backdrop-blur-sm" aria-hidden />
          <div className="tioli-join-qr-card size-[min(32rem,62vmin)]">
            <PlayerVoteQr label="Scan to play" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
