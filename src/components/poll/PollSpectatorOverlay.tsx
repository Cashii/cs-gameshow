"use client";

import { clampPollScale, type PollState } from "@/lib/poll/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { GameshowLogo } from "@/components/studio/GameshowLogo";

export function PollSpectatorOverlay({
  poll,
}: Readonly<{ poll: PollState }>) {
  const total = poll.choices.reduce((s, c) => s + c.votes, 0);
  const live = poll.status === "open";
  const idle = poll.status === "idle";
  const showCorrect =
    poll.correctAnswerRevealed && Boolean(poll.correctChoiceId);
  const showPercentages = poll.showPercentages !== false && !idle;
  const scale = clampPollScale(poll.scale);
  const count = poll.choices.length;
  const rows = Math.max(1, Math.ceil(count / 2));
  const stacked = rows >= 3;
  const questionMax = stacked ? "5rem" : "8rem";
  const questionVw = stacked ? "5.5vw" : "7.5vw";
  const answerCap = showPercentages ? "36cqh" : "52cqh";

  let statusLabel = "Poll results";
  if (idle) statusLabel = "Get ready";
  else if (live && !showPercentages) statusLabel = "Voting open";
  else if (live) statusLabel = "Live results";
  else if (!showPercentages) statusLabel = "Choices";
  else if (showCorrect) statusLabel = "Correct answer";

  return (
    <div className="relative z-10 h-full w-full overflow-hidden bg-[#0a0a0a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.18),transparent_42%),radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.16),transparent_40%),radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.14),transparent_45%)]" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col px-8 py-6 sm:px-16 sm:py-8">
        <div className="relative shrink-0">
          <div className="text-center">
            <GameshowLogo
              variant="noshadow"
              className={`mx-auto aspect-[699/463] w-auto ${
                stacked ? "h-12 sm:h-16" : "h-16 sm:h-20"
              }`}
              zoom={1}
              alt=""
            />
            <p className="mt-2 text-sm font-semibold tracking-[0.28em] text-amber-300 uppercase sm:text-base">
              {statusLabel}
            </p>
          </div>
          {live ? (
            <div className="absolute top-0 right-0 z-20 h-48 w-48 sm:h-56 sm:w-56">
              <PlayerVoteQr compact label="Scan to vote" />
            </div>
          ) : null}
        </div>
        <div className={`shrink-0 text-center ${live ? "pr-52 sm:pr-60" : ""}`}>
          <h1
            className={`font-bold text-white ${
              live || !stacked ? "mt-3 line-clamp-3" : "mt-2 line-clamp-2"
            }`}
            style={{
              fontFamily: "var(--font-oswald), Impact, sans-serif",
              fontSize: `calc(clamp(1.6rem, ${questionVw}, ${questionMax}) * ${scale})`,
              lineHeight: 1.05,
            }}
          >
            {poll.question.trim() || (idle ? "Waiting for a poll" : "Question?")}
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
                    className={`flex items-center justify-between gap-4 text-white ${
                      showPercentages ? "mb-[max(0.2rem,2cqh)]" : ""
                    }`}
                  >
                    <span
                      className="min-w-0 font-semibold line-clamp-2"
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
                        className={`shrink-0 font-bold tabular-nums ${
                          isCorrect ? "text-emerald-300" : "text-amber-300"
                        }`}
                        style={{
                          fontSize: `min(calc(clamp(1.75rem, 8vw, 7.5rem) * ${scale}), 42cqh)`,
                          lineHeight: 1,
                        }}
                      >
                        {`${pct}%`}
                      </span>
                    ) : null}
                  </div>
                  {showPercentages ? (
                    <div className="h-[clamp(0.45rem,9cqh,1.75rem)] overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          isCorrect
                            ? "bg-linear-to-r from-emerald-400 via-teal-400 to-lime-300"
                            : "bg-linear-to-r from-teal-400 via-cyan-400 to-amber-300"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

      </div>
    </div>
  );
}
