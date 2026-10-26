"use client";

import type { CSSProperties } from "react";
import {
  clampMessageBoardScale,
  type MessageBoardState,
} from "@/lib/message-board/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { GameshowLogo } from "@/components/studio/GameshowLogo";
import "@/styles/message-board-audience.css";

export function MessageBoardAudienceView({
  board,
}: Readonly<{ board: MessageBoardState }>) {
  const text = board.text.trim();
  const scale = clampMessageBoardScale(board.scale);
  const showJoinQr = Boolean(board.showJoinQr);

  return (
    <div
      className={`mb-stage${showJoinQr ? " mb-stage--qr" : ""}`}
      style={{ "--mb-text-scale": String(scale) } as CSSProperties}
    >
      <div className="mb-glow" aria-hidden />
      <div className="mb-harlequin" aria-hidden />
      <div className="mb-grain" aria-hidden />
      <div className="mb-sparkles" aria-hidden />
      <header className="mb-brand">
        <GameshowLogo className="mb-logo" variant="noshadow" alt="Jack'd Up" />
      </header>
      {showJoinQr ? (
        <div className="mb-join-qr">
          <div className="mb-join-qr-frame">
            <PlayerVoteQr label="Scan to play" />
          </div>
        </div>
      ) : (
        <div className="mb-body">
          {text ? (
            <p className="mb-message">{board.text}</p>
          ) : (
            <p className="mb-empty">No message</p>
          )}
        </div>
      )}
    </div>
  );
}
