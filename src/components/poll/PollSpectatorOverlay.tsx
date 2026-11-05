"use client";

import { useEffect, useState } from "react";
import {
  clampPollScale,
  formatPollClock,
  pollRemainingMs,
  pollTimerOnScreen,
  type PollState,
} from "@/lib/poll/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { GameshowLogo } from "@/components/studio/GameshowLogo";
import { StandbyScreen } from "@/components/studio/StandbyScreen";
import "@/styles/poll-audience.css";

function PollCountdown({ poll }: Readonly<{ poll: PollState }>) {
  const [now, setNow] = useState<number | null>(null);
  const visible = pollTimerOnScreen(poll);

  useEffect(() => {
    if (!visible) return;
    const tick = () => setNow(Date.now());
    tick();
    if (!poll.timerRunning) return;
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [visible, poll.timerRunning, poll.timerEndsAt]);

  if (!visible) return null;

  const remaining =
    now == null ? poll.timerRemainingMs : pollRemainingMs(poll, now);
  const clock = formatPollClock(remaining);
  const urgent = remaining > 0 && remaining <= 10_000;

  return (
    <div
      className={`absolute top-6 left-8 z-30 sm:top-8 sm:left-16 ${
        urgent ? "animate-pulse" : ""
      }`}
      role="timer"
      aria-live="polite"
      aria-label={clock}
    >
      <p
        className={`m-0 text-[clamp(4.25rem,10vw,8rem)] leading-none font-bold tracking-[0.04em] tabular-nums ${
          urgent ? "text-amber-200" : "text-white"
        }`}
        style={{
          textShadow: "0 2px 12px rgba(0,0,0,0.65)",
        }}
      >
        {clock}
      </p>
    </div>
  );
}

export function PollSpectatorOverlay({
  poll,
}: Readonly<{ poll: PollState }>) {
  const total = poll.choices.reduce((s, c) => s + c.votes, 0);
  const live = poll.status === "open";
  const showCorrect =
    poll.correctAnswerRevealed && Boolean(poll.correctChoiceId);
  const showPercentages = poll.showPercentages !== false;
  const [percentagesAnimatedIn, setPercentagesAnimatedIn] = useState(false);

  useEffect(() => {
    if (!showPercentages || poll.status === "idle") {
      setPercentagesAnimatedIn(false);
      return;
    }
    setPercentagesAnimatedIn(false);
    let innerFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() =>
        setPercentagesAnimatedIn(true),
      );
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [showPercentages, poll.id, poll.status]);

  // Keep standby while the operator drafts; Voting Live reveals the question.
  // ShowJoinQr lets them put up the player QR before the question is live.
  if (poll.status === "idle") {
    if (!poll.showJoinQr) return <StandbyScreen />;
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
              <PlayerVoteQr label="Scan to vote" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scale = clampPollScale(poll.scale);
  const count = poll.choices.length;
  const rows = Math.max(1, Math.ceil(count / 2));
  const stacked = rows >= 3;
  const questionMax = stacked ? "5rem" : "8rem";
  const questionVw = stacked ? "5.5vw" : "7.5vw";
  const answerCap = showPercentages ? "36cqh" : "52cqh";
  const timerVisible = pollTimerOnScreen(poll);

  return (
    <div className="poll-stage">
      <div className="poll-stage__glow" aria-hidden />
      <div className="poll-stage__wash" aria-hidden />
      <div className="poll-stage__wash-soft" aria-hidden />
      <div className="poll-stage__orbs" aria-hidden />
      <div className="poll-stage__sparkles" aria-hidden />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col px-8 py-6 sm:px-16 sm:py-8">
        <div className="relative shrink-0">
          <div className="text-center">
            <GameshowLogo
              variant="noshadow"
              className={`mx-auto aspect-[699/463] w-auto ${
                stacked ? "h-16 sm:h-24" : "h-20 sm:h-28"
              }`}
              zoom={1}
              alt=""
            />
          </div>
          {live ? (
            <div className="absolute top-0 right-0 z-20 h-48 w-48 sm:h-56 sm:w-56">
              <PlayerVoteQr compact label="Scan to vote" />
            </div>
          ) : null}
        </div>
        <div
          className={`shrink-0 text-center ${live ? "pr-52 sm:pr-60" : ""} ${
            timerVisible ? "pl-40 sm:pl-52" : ""
          }`}
        >
          <h1
            className={`font-bold text-white line-clamp-3 ${
              timerVisible ? "mt-8 sm:mt-10" : "mt-5 sm:mt-6"
            }`}
            style={{
              fontFamily: "var(--font-oswald), Impact, sans-serif",
              fontSize: `calc(clamp(1.6rem, ${questionVw}, ${questionMax}) * ${scale})`,
              lineHeight: 1.05,
            }}
          >
            {poll.question.trim() || "Question?"}
          </h1>
        </div>

        <ul
          className={`mx-auto grid min-h-0 w-full flex-1 grid-cols-2 overflow-hidden ${
            stacked ? "mt-4" : "mt-6"
          }`}
          style={{
            gap: stacked ? "0.75rem" : "1.25rem",
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            ["--poll-gap" as string]: stacked ? "0.75rem" : "1.25rem",
          }}
        >
          {poll.choices.map((choice, index) => {
            const pct = total > 0 ? Math.round((choice.votes / total) * 100) : 0;
            const isCorrect = showCorrect && choice.id === poll.correctChoiceId;
            const centered = count % 2 === 1 && index === count - 1;
            return (
              <li
                key={choice.id}
                className={`flex h-full min-h-0 flex-col justify-center overflow-hidden rounded-4xl border px-6 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm ${
                  centered
                    ? "col-span-2 w-[calc((100%-var(--poll-gap))/2)] justify-self-center"
                    : ""
                } ${
                  isCorrect
                    ? "border-emerald-400/80 bg-emerald-500/20 ring-2 ring-emerald-300/50"
                    : showCorrect
                      ? "border-white/8 bg-black/25 opacity-70"
                      : "border-white/12 bg-black/35"
                }`}
              >
                <div
                  className="flex h-full min-h-0 w-full flex-col justify-center"
                  style={{ containerType: "size" }}
                >
                  <div
                    className={`flex flex-col items-center text-center text-white ${
                      showPercentages ? "mb-[max(0.2rem,2cqh)]" : ""
                    }`}
                  >
                    <span
                      className="min-w-0 w-full font-semibold line-clamp-2"
                      style={{
                        fontSize: `min(calc(clamp(1.5rem, 7.5vw, 6.75rem) * ${scale}), ${answerCap})`,
                        lineHeight: 1.1,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {choice.text}
                      {isCorrect ? " ✓" : ""}
                    </span>
                    {showPercentages ? (
                      <span
                        className={`poll-pct-label mt-[max(0.15rem,1.5cqh)] shrink-0 font-bold tabular-nums ${
                          percentagesAnimatedIn ? "poll-pct-label--in" : ""
                        } ${isCorrect ? "poll-pct-label--correct" : ""}`}
                        style={{
                          fontSize: `min(calc(clamp(1.75rem, 8vw, 7.5rem) * ${scale}), 42cqh)`,
                          lineHeight: 1,
                          transitionDelay: percentagesAnimatedIn
                            ? `${index * 70}ms`
                            : "0ms",
                        }}
                      >
                        {`${pct}%`}
                      </span>
                    ) : null}
                  </div>
                  {showPercentages ? (
                    <div className="poll-bar-track">
                      <div
                        className={`poll-bar-fill ${
                          percentagesAnimatedIn ? "poll-bar-fill--in" : ""
                        } ${isCorrect ? "poll-bar-fill--correct" : ""}`}
                        style={{
                          width: `${pct}%`,
                          transitionDelay: percentagesAnimatedIn
                            ? `${index * 70}ms`
                            : "0ms",
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <PollCountdown poll={poll} />
    </div>
  );
}
