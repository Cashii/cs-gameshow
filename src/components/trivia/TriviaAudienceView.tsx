"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TriviaGameState } from "@/lib/trivia/types";
import {
  MIN_TRIVIA_OPTIONS,
  formatTriviaClock,
  optionTextForChoice,
  triviaChoiceIdAt,
  triviaRemainingMs,
  triviaTimerOnScreen,
} from "@/lib/trivia/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { StandbyScreen } from "@/components/studio/StandbyScreen";
import "@/styles/trivia-audience.css";

function TriviaCountdown({ trivia }: Readonly<{ trivia: TriviaGameState }>) {
  const [now, setNow] = useState<number | null>(null);
  const visible = triviaTimerOnScreen(trivia);

  useEffect(() => {
    if (!visible) return;
    const tick = () => setNow(Date.now());
    tick();
    if (!trivia.timerRunning) return;
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [visible, trivia.timerRunning, trivia.timerEndsAt]);

  if (!visible) return null;

  const remaining =
    now == null ? trivia.timerRemainingMs : triviaRemainingMs(trivia, now);
  const clock = formatTriviaClock(remaining);
  const urgent = remaining > 0 && remaining <= 10_000;

  return (
    <div
      className={`trivia-countdown ${urgent ? "trivia-countdown-urgent" : ""}`}
      role="timer"
      aria-live="polite"
      aria-label={clock}
    >
      <p className="trivia-countdown-clock">{clock}</p>
    </div>
  );
}

export function TriviaAudienceView({
  trivia,
}: Readonly<{ trivia: TriviaGameState }>) {
  // Keep standby while the operator drafts the next question; Open voting reveals it.
  const waiting =
    trivia.status === "idle" || !trivia.question.trim();
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
      trivia.winnerCodes.length === 0
        ? "No winners"
        : trivia.winnerCodes.length === 1
          ? `Winner ${trivia.winnerCodes[0] ?? ""}`
          : `${trivia.remainingCount} winners`;
  } else if (survivingLabel) {
    statusText = `${survivingLabel} survives`;
  }

  if (waiting) {
    if (!trivia.showJoinQr) return <StandbyScreen />;
    return (
      <div className="relative h-full w-full overflow-hidden">
        <StandbyScreen />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-sm"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.35) 32%, rgba(10,10,10,0.55) 100%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-4 rounded-3xl bg-neutral-950/20 px-6 py-5">
            <div className="size-[min(32rem,62vmin)]">
              <PlayerVoteQr label="Scan to play" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trivia-stage">
      <div className="trivia-glow" aria-hidden />
      <div className="trivia-sparkles" aria-hidden />
      <TriviaCountdown trivia={trivia} />
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
