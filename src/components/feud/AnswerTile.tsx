"use client";

import type { FeudAnswer } from "@/lib/feud/types";

export function AnswerTile({
  index,
  answer,
  revealed,
}: Readonly<{ index: number; answer: FeudAnswer; revealed: boolean }>) {
  return (
    <div className={`tile ${revealed ? "revealed" : "hidden"}`}>
      <div className="tile-inner">
        <div className="tile-front">{index + 1}</div>
        <div className="tile-back">
          <span className="tile-text">{answer.text}</span>
          <span className="tile-points">{answer.points}</span>
        </div>
      </div>
    </div>
  );
}
