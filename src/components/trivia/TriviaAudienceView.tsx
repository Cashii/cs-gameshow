"use client";

import type { TriviaGameState } from "@/lib/trivia/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { StandbyScreen } from "@/components/studio/StandbyScreen";
import "@/styles/trivia-audience.css";

export function TriviaAudienceView({
  trivia,
}: Readonly<{ trivia: TriviaGameState }>) {
  const waiting = !trivia.question.trim();
  const showSplit =
    trivia.status === "revealed" || trivia.status === "finished";
  const survivingLabel =
    trivia.survivingChoiceId === "a"
      ? trivia.optionA
      : trivia.survivingChoiceId === "b"
        ? trivia.optionB
        : null;

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
      <div className="trivia-choices">
        <div
          className={[
            "trivia-choice trivia-choice-a",
            showSplit && trivia.survivingChoiceId === "a"
              ? "trivia-choice-survives"
              : "",
            showSplit && trivia.survivingChoiceId === "b"
              ? "trivia-choice-out"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="trivia-choice-label">{trivia.optionA}</p>
          {showSplit ? (
            <p className="trivia-choice-count">{trivia.choiceACount}</p>
          ) : null}
        </div>
        <div
          className={[
            "trivia-choice trivia-choice-b",
            showSplit && trivia.survivingChoiceId === "b"
              ? "trivia-choice-survives"
              : "",
            showSplit && trivia.survivingChoiceId === "a"
              ? "trivia-choice-out"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="trivia-choice-label">{trivia.optionB}</p>
          {showSplit ? (
            <p className="trivia-choice-count">{trivia.choiceBCount}</p>
          ) : null}
        </div>
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
