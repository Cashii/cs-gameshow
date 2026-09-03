"use client";

import { useEffect, useRef, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import type { SpectatorScreen } from "@/lib/suite-state";
import { ActiveGameBoard } from "@/components/suite/ActiveGameBoard";
import { PollSpectatorOverlay } from "@/components/poll/PollSpectatorOverlay";
import { PollWaitingScreen } from "@/components/poll/PollWaitingScreen";

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
      setTransitionPhase((phase) => (phase === "visible" ? phase : "visible"));
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
            <PollWaitingScreen />
          ) : (
            <PollSpectatorOverlay poll={state.poll} />
          )
        ) : (
          <ActiveGameBoard
            activeGame={displayedGame}
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
