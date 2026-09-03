"use client";

import type { CSSProperties } from "react";
import type { TriviaGameState } from "@/lib/trivia/types";
import {
  MIN_TRIVIA_OPTIONS,
  optionTextForChoice,
  triviaChoiceIdAt,
} from "@/lib/trivia/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { StandbyScreen } from "@/components/studio/StandbyScreen";
import "@/styles/trivia-audience.css";

export function TriviaAudienceView({
  trivia,
}: Readonly<{ trivia: TriviaGameState }>) {
  const waiting = !trivia.question.trim();
  const showSplit =
    trivia.status === "revealed" || trivia.status === "finished";
  const options =
    trivia.options?.length >= MIN_TRIVIA_OPTIONS
      ? trivia.options
      : [trivia.optionA, trivia.optionB];
  const survivingLabel = optionTextForChoice(
    options,
    trivia.survivingChoiceId,
  );
  const cols = options.length === 4 ? 2 : Math.min(3, Math.max(2, options.length));

  let statusText = "Remaining";
  if (trivia.status === "open") {
    statusText = `${trivia.answeredCount} answers in`;
  } else if (trivia.status === "finished") {
    statusText =
      trivia.winnerCodes.length === 1
        ? `Winner ${trivia.winnerCodes[0] ?? ""}`
        : `${trivia.remainingCount} winners`;
  } else if (survivingLabel) {
    statusText = `${survivingLabel} survives`;
  }

  if (waiting) {
    return <StandbyScreen />;
  }

  return (
    <div className="trivia-stage">
      <div className="trivia-glow" aria-hidden />
      <div className="trivia-sparkles" aria-hidden />
      <h1 className="trivia-question">{trivia.question.trim()}</h1>
      <div
        className="trivia-choices"
        style={{ "--trivia-cols": cols } as CSSProperties}
      >
        {options.map((option, index) => {
          const choiceId = triviaChoiceIdAt(index);
          if (!choiceId) return null;
          const count =
            trivia.choiceCounts?.[index] ??
            (index === 0
              ? trivia.choiceACount
              : index === 1
                ? trivia.choiceBCount
                : 0);
          return (
            <div
              key={choiceId}
              className={[
                "trivia-choice",
                `trivia-choice-${choiceId}`,
                showSplit && trivia.survivingChoiceId === choiceId
                  ? "trivia-choice-survives"
                  : "",
                showSplit &&
                trivia.survivingChoiceId &&
                trivia.survivingChoiceId !== choiceId
                  ? "trivia-choice-out"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <p className="trivia-choice-label">{option}</p>
              {showSplit ? (
                <p className="trivia-choice-count">{count}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="trivia-bottom">
        <div className="trivia-remaining">
          <p className="trivia-count">{trivia.remainingCount}</p>
          <p className="trivia-status">{statusText}</p>
          {trivia.status === "finished" && trivia.winnerCodes.length > 1 ? (
            <p className="trivia-winners">{trivia.winnerCodes.join("  ")}</p>
          ) : null}
        </div>
        <div className="trivia-qr">
          <PlayerVoteQr label="Scan to play" />
        </div>
      </div>
    </div>
  );
}
