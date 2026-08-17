"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import type { ActiveGame } from "@/lib/suite-state";
import { FeudAudienceView } from "@/components/feud/FeudAudienceView";
import { WheelAudienceView } from "@/components/wheel/WheelAudienceView";
import { LiveDrawerReveal } from "@/components/live-drawer/LiveDrawerReveal";
import { TakeItOrLeaveItAudienceView } from "@/components/take-it-or-leave-it/TakeItOrLeaveItAudienceView";

const standbyScreen = (
  <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-950 text-center">
    <h1
      className="text-5xl font-bold tracking-wide text-white sm:text-7xl"
      style={{ fontFamily: "var(--font-oswald), Impact, sans-serif" }}
    >
      CS Gameshow
    </h1>
    <p className="mt-4 text-lg tracking-[0.2em] text-neutral-400 uppercase">
      Stand by
    </p>
  </div>
);

function AudienceContent() {
  const { state, currentFeudRound } = useSuite();
  const [displayedGame, setDisplayedGame] = useState<ActiveGame>(
    state.activeGame,
  );
  const [displayedCovered, setDisplayedCovered] = useState(
    state.audienceCovered,
  );
  const [transitionPhase, setTransitionPhase] = useState<
    "visible" | "exit" | "enter"
  >("visible");
  const displayedGameRef = useRef(displayedGame);
  const displayedCoveredRef = useRef(displayedCovered);

  useEffect(() => {
    if (
      state.activeGame === displayedGameRef.current &&
      state.audienceCovered === displayedCoveredRef.current
    ) {
      return;
    }

    const exitFrame = requestAnimationFrame(() => {
      setTransitionPhase("exit");
    });
    const swapTimer = window.setTimeout(() => {
      displayedGameRef.current = state.activeGame;
      displayedCoveredRef.current = state.audienceCovered;
      setDisplayedGame(state.activeGame);
      setDisplayedCovered(state.audienceCovered);
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
  }, [state.activeGame, state.audienceCovered]);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  let content: ReactNode;

  if (displayedCovered || displayedGame === "idle") {
    content = standbyScreen;
  } else if (displayedGame === "feud") {
    if (!currentFeudRound) {
      content = (
        <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-white">
          No round data.
        </div>
      );
    } else {
      content = (
        <div className="h-full w-full overflow-hidden">
          <FeudAudienceView
            round={currentFeudRound}
            showHeader={state.feud.showHeader}
            leftTeam={state.feud.leftTeam}
            rightTeam={state.feud.rightTeam}
            showTeamScores={state.feud.showTeamScores}
            showAnswerScores={state.feud.showAnswerScores}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      );
    }
  } else if (displayedGame === "wheel") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <WheelAudienceView wheel={state.wheel} />
      </div>
    );
  } else if (displayedGame === "liveDrawer") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <LiveDrawerReveal game={state.liveDrawer} />
      </div>
    );
  } else if (displayedGame === "takeIt") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <TakeItOrLeaveItAudienceView game={state.takeIt} />
      </div>
    );
  } else {
    content = standbyScreen;
  }

  return (
    <div
      className={`audience-page-transition audience-page-transition--${transitionPhase}`}
    >
      {content}
    </div>
  );
}

export function AudienceShell() {
  return (
    <SuiteProvider role="audience">
      <AudienceContent />
    </SuiteProvider>
  );
}
