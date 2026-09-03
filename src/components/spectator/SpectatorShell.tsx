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
  const showPoll = spectatorGame === "poll";
  const showStandby = spectatorGame === "idle";

  useEffect(() => {
    if (spectatorGame === displayedGameRef.current) {
      setTransitionPhase("visible");
      return;
    }

    const from = displayedGameRef.current;
    const to = spectatorGame;
    const leavingStandby = from === "idle";
    const enteringStandby = to === "idle";

    if (leavingStandby) {
      displayedGameRef.current = to;
      setDisplayedGame(to);
      setTransitionPhase("enter");
      const settleTimer = window.setTimeout(() => {
        setTransitionPhase("visible");
      }, 350);
      return () => {
        clearTimeout(settleTimer);
      };
    }

    const exitFrame = requestAnimationFrame(() => {
      setTransitionPhase("exit");
    });
    const swapTimer = window.setTimeout(() => {
      displayedGameRef.current = to;
      setDisplayedGame(to);
      setTransitionPhase(enteringStandby ? "visible" : "enter");
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

  return (
    <div className="relative h-full min-h-full w-full">
      <div className="spectator-standby">
        <StandbyScreen paused={!showStandby} />
      </div>
      {showPoll ? (
        <div
          className={`audience-page-transition audience-page-transition--${transitionPhase} h-full w-full`}
        >
          <PollSpectatorOverlay poll={state.poll} />
        </div>
      ) : !showStandby ? (
        <div
          className={`audience-page-transition audience-page-transition--${transitionPhase} h-full w-full`}
        >
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
