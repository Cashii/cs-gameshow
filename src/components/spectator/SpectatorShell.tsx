"use client";

import { useEffect, useRef, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import type { SpectatorScreen } from "@/lib/suite-state";
import { ActiveGameBoard } from "@/components/suite/ActiveGameBoard";
import { PollSpectatorOverlay } from "@/components/poll/PollSpectatorOverlay";
import { StandbyScreen } from "@/components/studio/StandbyScreen";

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
  const showPoll = displayedGame === "poll";
  const showStandby = displayedGame === "idle";

  useEffect(() => {
    if (spectatorGame === displayedGameRef.current) {
      setTransitionPhase("visible");
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

  const transitionClass = `audience-page-transition audience-page-transition--${transitionPhase} h-full w-full`;

  return (
    <div className="relative h-full min-h-full w-full bg-black">
      <div className="spectator-blackout" aria-hidden />
      <div
        className={
          showStandby ? transitionClass : "spectator-standby-held"
        }
      >
        <StandbyScreen paused={!showStandby} />
      </div>
      {showPoll ? (
        <div className={transitionClass}>
          <PollSpectatorOverlay poll={state.poll} />
        </div>
      ) : !showStandby ? (
        <div className={transitionClass}>
          <ActiveGameBoard
            activeGame={displayedGame}
            state={state}
            currentFeudRound={currentFeudRound}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      ) : null}
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
