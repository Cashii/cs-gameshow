"use client";

import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import { FeudAudienceView } from "@/components/feud/FeudAudienceView";
import { WheelAudienceView } from "@/components/wheel/WheelAudienceView";
import { NumberDrawReveal } from "@/components/draw/NumberDrawReveal";

function AudienceContent() {
  const { state, currentFeudRound } = useSuite();

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  if (state.activeGame === "feud") {
    if (!currentFeudRound) {
      return (
        <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
          No round data.
        </div>
      );
    }
    return (
      <div className="h-screen w-screen overflow-hidden">
        <FeudAudienceView
          round={currentFeudRound}
          showHeader={state.feud.showHeader}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    );
  }

  if (state.activeGame === "wheel") {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <WheelAudienceView wheel={state.wheel} />
      </div>
    );
  }

  if (state.activeGame === "draw") {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <NumberDrawReveal draw={state.draw} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-950 text-center">
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
}

export function AudienceShell() {
  return (
    <SuiteProvider role="audience">
      <AudienceContent />
    </SuiteProvider>
  );
}
