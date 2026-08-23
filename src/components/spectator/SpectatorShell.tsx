"use client";

import { useEffect, useRef, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import type { SpectatorScreen } from "@/lib/suite-state";
import { ActiveGameBoard } from "@/components/suite/ActiveGameBoard";
import { PollSpectatorOverlay } from "@/components/poll/PollSpectatorOverlay";
import { PlayerVoteQr } from "@/components/poll/PlayerVoteQr";

function SpectatorContent() {
  const { state, currentFeudRound } = useSuite();
  const spectatorGame: SpectatorScreen =
    state.spectatorGame ?? state.activeGame;
  const [displayedGame, setDisplayedGame] =
    useState<SpectatorScreen>(spectatorGame);
  const [transitionPhase, setTransitionPhase] = useState<
    "visible" | "exit" | "enter"
  >("visible");
  const displayedGameRef = useRef(displayedGame);

  useEffect(() => {
    if (spectatorGame === displayedGameRef.current) {
      return;
    }

    const exitFrame = requestAnimationFrame(() => {
      setTransitionPhase("exit");
    });
    const swapTimer = window.setTimeout(() => {
      displayedGameRef.current = spectatorGame;
      setDisplayedGame(spectatorGame);
      setTransitionPhase("enter");
    }, 350);
    const settleTimer = window.setTimeout(() => {
      setTransitionPhase("visible");
    }, 700);

    return () => {
      cancelAnimationFrame(exitFrame);
      clearTimeout(swapTimer);
      clearTimeout(settleTimer);
    };
  }, [spectatorGame]);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const showPoll = displayedGame === "poll";

  return (
    <div className="relative h-full w-full">
      <div
        className={`audience-page-transition audience-page-transition--${transitionPhase} h-full w-full`}
      >
        {showPoll ? (
          state.poll.status === "idle" ? (
            <div className="flex h-full min-h-0 w-full flex-col items-center bg-neutral-950 px-8 py-8 text-center">
              <div className="shrink-0">
                <p className="text-sm font-semibold tracking-[0.28em] text-sky-400 uppercase">
                  Poll
                </p>
                <p className="mt-3 text-2xl text-neutral-400 sm:text-4xl">
                  Waiting for the operator to open a poll
                </p>
              </div>
              <div className="mt-8 min-h-0 w-full flex-1">
                <PlayerVoteQr />
              </div>
            </div>
          ) : (
            <PollSpectatorOverlay poll={state.poll} />
          )
        ) : (
          <ActiveGameBoard
            activeGame={displayedGame === "poll" ? "idle" : displayedGame}
            state={state}
            currentFeudRound={currentFeudRound}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </div>
    </div>
  );
}

export function SpectatorShell() {
  return (
    <SuiteProvider role="spectator">
      <SpectatorContent />
    </SuiteProvider>
  );
}
