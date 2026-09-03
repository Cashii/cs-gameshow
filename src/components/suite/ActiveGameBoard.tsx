"use client";

import type { ReactNode } from "react";
import type { ActiveGame, SuiteState } from "@/lib/suite-state";
import type { FeudRound } from "@/lib/feud/types";
import { FeudAudienceView } from "@/components/feud/FeudAudienceView";
import { WheelAudienceView } from "@/components/wheel/WheelAudienceView";
import { LiveDrawerReveal } from "@/components/live-drawer/LiveDrawerReveal";
import { TakeItOrLeaveItAudienceView } from "@/components/take-it-or-leave-it/TakeItOrLeaveItAudienceView";
import { MessageBoardAudienceView } from "@/components/message-board/MessageBoardAudienceView";
import { DerbyAudienceView } from "@/components/derby/DerbyAudienceView";
import { JeoparodyAudienceView } from "@/components/jeoparody/JeoparodyAudienceView";
import { TriviaAudienceView } from "@/components/trivia/TriviaAudienceView";
import { PriceGuesserAudienceView } from "@/components/price-guesser/PriceGuesserAudienceView";
import { PriceOrderAudienceView } from "@/components/price-order/PriceOrderAudienceView";
import { QuestionTimeAudienceView } from "@/components/question-time/QuestionTimeAudienceView";
import { PictionaryAudienceView } from "@/components/pictionary/PictionaryAudienceView";
import { createDefaultPriceGuesserState } from "@/lib/price-guesser/types";
import { createDefaultPriceOrderState } from "@/lib/price-order/types";
import { createDefaultQuestionTimeState } from "@/lib/question-time/types";
import { createDefaultPictionaryState } from "@/lib/pictionary/types";
import { createDefaultMessageBoardState } from "@/lib/message-board/types";
import { StandbyScreen } from "@/components/studio/StandbyScreen";

const standbyScreen = <StandbyScreen />;

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
          board={state.messageBoard ?? createDefaultMessageBoardState()}
        />
      </div>
    );
  } else if (activeGame === "derby") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <DerbyAudienceView game={state.derby} />
      </div>
    );
  } else if (activeGame === "jeoparody") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <JeoparodyAudienceView
          game={state.jeoparody}
          onToggleFullscreen={onToggleFullscreen}
        />
      </div>
    );
  } else if (activeGame === "trivia") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <TriviaAudienceView trivia={state.trivia} />
      </div>
    );
  } else if (activeGame === "priceGuesser") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <PriceGuesserAudienceView
          game={state.priceGuesser ?? createDefaultPriceGuesserState()}
        />
      </div>
    );
  } else if (activeGame === "priceOrder") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <PriceOrderAudienceView
          game={state.priceOrder ?? createDefaultPriceOrderState()}
        />
      </div>
    );
  } else if (activeGame === "questionTime") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <QuestionTimeAudienceView
          game={state.questionTime ?? createDefaultQuestionTimeState()}
        />
      </div>
    );
  } else if (activeGame === "pictionary") {
    content = (
      <div className="h-full w-full overflow-hidden">
        <PictionaryAudienceView
          game={state.pictionary ?? createDefaultPictionaryState()}
        />
      </div>
    );
  } else {
    content = standbyScreen;
  }

  return content;
}
