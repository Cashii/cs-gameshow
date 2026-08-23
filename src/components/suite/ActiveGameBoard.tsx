"use client";

import type { ReactNode } from "react";
import type { ActiveGame, SuiteState } from "@/lib/suite-state";
import type { FeudRound } from "@/lib/feud/types";
import { FeudAudienceView } from "@/components/feud/FeudAudienceView";
import { WheelAudienceView } from "@/components/wheel/WheelAudienceView";
import { LiveDrawerReveal } from "@/components/live-drawer/LiveDrawerReveal";
import { TakeItOrLeaveItAudienceView } from "@/components/take-it-or-leave-it/TakeItOrLeaveItAudienceView";
import { MessageBoardAudienceView } from "@/components/message-board/MessageBoardAudienceView";

export const standbyScreen = (
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

export function ActiveGameBoard({
  activeGame,
  covered = false,
  state,
  currentFeudRound,
  onToggleFullscreen,
}: {
  activeGame: ActiveGame;
  covered?: boolean;
  state: SuiteState;
  currentFeudRound: FeudRound | undefined;
  onToggleFullscreen?: () => void;
}) {
  let content: ReactNode;

  if (covered || activeGame === "idle") {
    content = standbyScreen;
  } else if (activeGame === "feud") {
    content = currentFeudRound ? (
      <div className="h-full w-full overflow-hidden">
        <FeudAudienceView
          round={currentFeudRound}
          showHeader={state.feud.showHeader}
          leftTeam={state.feud.leftTeam}
          rightTeam={state.feud.rightTeam}
          showTeamScores={state.feud.showTeamScores}
          showAnswerScores={state.feud.showAnswerScores}
          onToggleFullscreen={onToggleFullscreen}
        />
      </div>
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-white">
        No round data.
      </div>
    );
  } else if (activeGame === "wheel") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <WheelAudienceView wheel={state.wheel} />
      </div>
    );
  } else if (activeGame === "liveDrawer") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <LiveDrawerReveal game={state.liveDrawer} />
      </div>
    );
  } else if (activeGame === "takeIt") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <TakeItOrLeaveItAudienceView game={state.takeIt} />
      </div>
    );
  } else if (activeGame === "messageBoard") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <MessageBoardAudienceView
          board={state.messageBoard ?? { text: "" }}
        />
      </div>
    );
  } else {
    content = standbyScreen;
  }

  return content;
}
