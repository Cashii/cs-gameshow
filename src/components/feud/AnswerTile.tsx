"use client";

import type { FeudAnswer } from "@/lib/feud/types";

export function AnswerTile({
  index,
  answer,
  revealed,
  showAnswerScores = true,
}: Readonly<{
  index: number;
  answer: FeudAnswer;
  revealed: boolean;
  showAnswerScores?: boolean;
}>) {
  return (
    <div
      className={`tile ${revealed ? "revealed" : "concealed"}${
        showAnswerScores ? "" : " no-points"
      }`}
    >
      <div className="tile-inner">
        <div className="tile-front">
          <span className="tile-number">{index + 1}</span>
        </div>
        <div className="tile-back">
          <span className="tile-text">{answer.text}</span>
          {showAnswerScores && (
            <span className="tile-points">{answer.points}</span>
          )}
        </div>
      </div>
    </div>
  );
}
