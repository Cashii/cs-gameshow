"use client";

import type { MessageBoardState } from "@/lib/message-board/types";

export function MessageBoardAudienceView({
  board,
}: Readonly<{ board: MessageBoardState }>) {
  const text = board.text.trim();

  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-950 px-[6vw] py-[8vh]">
      {text ? (
        <p
          className="max-w-[90%] text-center font-bold break-words text-white whitespace-pre-wrap"
          style={{
            fontFamily: "var(--font-oswald), Impact, sans-serif",
            fontSize: "clamp(2.25rem, 7vw, 6.5rem)",
            lineHeight: 1.15,
            letterSpacing: "0.02em",
          }}
        >
          {board.text}
        </p>
      ) : (
        <p className="text-2xl tracking-wide text-neutral-500">No message</p>
      )}
    </div>
  );
}
