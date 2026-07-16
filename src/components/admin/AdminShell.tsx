"use client";

import {
  ChevronRight,
  CircleDollarSign,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import {
  ACTIVE_GAME_LABELS,
  type ActiveGame,
} from "@/lib/suite-state";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { FeudHostPanel } from "@/components/feud/FeudHostPanel";
import { WheelHostPanel } from "@/components/wheel/WheelHostPanel";
import { DrawHostPanel } from "@/components/draw/DrawHostPanel";

const GAMES: ActiveGame[] = ["idle", "feud", "wheel", "draw"];

const GAME_ICONS: Record<ActiveGame, LucideIcon> = {
  idle: Home,
  feud: Users,
  wheel: CircleDollarSign,
  draw: Ticket,
};

const GAME_DESCRIPTIONS: Record<Exclude<ActiveGame, "idle">, string> = {
  feud: "Reveal survey answers, track strikes, and run each round.",
  wheel: "Set a phrase and reveal letters on the audience board.",
  draw: "Draw a ticket number and animate it for the audience.",
};

function AdminContent() {
  const { state, setActiveGame } = useSuite();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openAudience = () => {
    window.open(
      "/audience",
      "cs_gameshow_audience",
      "width=1400,height=900",
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <aside
        className={`flex shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 transition-[width] duration-200 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div
          className={`flex min-h-20 items-center border-b border-neutral-800 ${
            sidebarCollapsed
              ? "justify-center px-3"
              : "justify-between gap-3 px-5"
          }`}
        >
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="font-gameshow truncate text-xl font-bold tracking-wide text-white">
                Cash&apos;s Gameshow
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} aria-hidden />
            ) : (
              <PanelLeftClose size={20} aria-hidden />
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {GAMES.map((game) => {
            const active = state.activeGame === game;
            const Icon = GAME_ICONS[game];
            return (
              <button
                key={game}
                type="button"
                onClick={() => setActiveGame(game)}
                title={sidebarCollapsed ? ACTIVE_GAME_LABELS[game] : undefined}
                aria-label={ACTIVE_GAME_LABELS[game]}
                className={`flex w-full items-center rounded-lg py-3 text-left text-sm font-semibold transition-colors ${
                  sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"
                } ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                }`}
              >
                <Icon size={19} className="shrink-0" aria-hidden />
                {!sidebarCollapsed && (
                  <span>{ACTIVE_GAME_LABELS[game]}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 p-3">
          <button
            type="button"
            onClick={openAudience}
            title={sidebarCollapsed ? "Open Audience" : undefined}
            aria-label="Open Audience"
            className={`inline-flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-500 ${
              sidebarCollapsed ? "px-2" : "gap-2 px-4"
            }`}
          >
            <Presentation size={17} className="shrink-0" />
            {!sidebarCollapsed && "Open Audience"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center border-b border-neutral-800 bg-neutral-900/80 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {ACTIVE_GAME_LABELS[state.activeGame]}
            </h1>
            <p className="text-sm text-neutral-500">
              {state.activeGame === "idle"
                ? "Choose a game to get started"
                : "Host controls"}
            </p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          {state.activeGame === "idle" && (
            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-8 py-12">
              <div className="mb-10">
                <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-blue-400 uppercase">
                  Host Dashboard
                </p>
                <h2 className="font-gameshow text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Welcome to Cash&apos;s Gameshow App
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-400">
                  Choose a game below to open its host controls and put it on
                  the audience display.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {(["feud", "wheel", "draw"] as const).map((game) => {
                  const Icon = GAME_ICONS[game];
                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => setActiveGame(game)}
                      className="group flex min-h-64 flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-left transition-all hover:-translate-y-1 hover:border-blue-500/70 hover:bg-neutral-800 hover:shadow-2xl hover:shadow-blue-950/30"
                    >
                      <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <Icon size={28} aria-hidden />
                      </span>
                      <span className="text-xl font-bold text-white">
                        {ACTIVE_GAME_LABELS[game]}
                      </span>
                      <span className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
                        {GAME_DESCRIPTIONS[game]}
                      </span>
                      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-blue-400">
                        Open game
                        <ChevronRight
                          size={16}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {state.activeGame === "feud" && <FeudHostPanel />}
          {state.activeGame === "wheel" && <WheelHostPanel />}
          {state.activeGame === "draw" && <DrawHostPanel />}
        </main>
      </div>
    </div>
  );
}

export function AdminShell() {
  return (
    <SuiteProvider role="admin">
      <TooltipProvider>
        <AdminContent />
      </TooltipProvider>
    </SuiteProvider>
  );
}
