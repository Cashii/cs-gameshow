"use client";

import type { PollState } from "@/lib/poll/types";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";
import { GameshowLogo } from "@/components/studio/GameshowLogo";

export function PollSpectatorOverlay({
  poll,
}: Readonly<{ poll: PollState }>) {
  const total = poll.choices.reduce((s, c) => s + c.votes, 0);
  const live = poll.status === "open";
  const idle = poll.status === "idle";

  let statusLabel = "Poll results";
  if (idle) statusLabel = "Get ready";
  else if (live) statusLabel = "Live results";

  return (
    <div className="relative z-10 h-full w-full overflow-hidden bg-[#0a0a0a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.18),transparent_42%),radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.16),transparent_40%),radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.14),transparent_45%)]" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col px-8 py-6 sm:px-16 sm:py-8">
        <div className="flex shrink-0 justify-center">
          <GameshowLogo
            variant="noshadow"
            className="h-16 w-auto aspect-[699/463] sm:h-20"
            zoom={1}
            alt=""
          />
        </div>
        <div className="shrink-0 text-center">
          <p className="text-sm font-semibold tracking-[0.28em] text-amber-300 uppercase sm:text-base">
            {statusLabel}
          </p>
          <h1
            className="mt-3 font-bold text-white"
            style={{
              fontFamily: "var(--font-oswald), Impact, sans-serif",
              fontSize: "clamp(2.75rem, 7.5vw, 8rem)",
              lineHeight: 1.05,
            }}
          >
            {poll.question.trim() || (idle ? "Waiting for a poll" : "Question?")}
          </h1>
        </div>

        <ul className="mx-auto mt-8 max-h-[52%] w-full max-w-6xl shrink-0 space-y-6 overflow-auto">
          {poll.choices.map((choice) => {
            const pct = total > 0 ? Math.round((choice.votes / total) * 100) : 0;
            return (
              <li
                key={choice.id}
                className="rounded-4xl border border-white/12 bg-black/35 px-6 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm"
              >
                <div className="mb-3 flex items-end justify-between gap-6 text-white">
                  <span
                    className="min-w-0 font-semibold"
                    style={{
                      fontSize: "clamp(1.75rem, 4.2vw, 4.75rem)",
                      lineHeight: 1.1,
                    }}
                  >
                    {choice.text}
                  </span>
                  <span
                    className="shrink-0 font-bold tabular-nums text-amber-300"
                    style={{
                      fontSize: "clamp(2rem, 5vw, 5.5rem)",
                      lineHeight: 1,
                    }}
                  >
                    {idle ? "—" : `${pct}%`}
                  </span>
                </div>
                <div className="h-5 overflow-hidden rounded-full bg-white/10 sm:h-7">
                  <div
                    className="bg-linear-to-r h-full rounded-full from-teal-400 via-cyan-400 to-amber-300 transition-all duration-500 ease-out"
                    style={{ width: idle ? "0%" : `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {live && (
          <div className="mx-auto mt-8 min-h-0 w-full min-w-0 flex-1 pt-2">
            <PlayerVoteQr label="Scan to vote" />
          </div>
        )}
      </div>
    </div>
  );
}
