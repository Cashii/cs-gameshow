"use client";

import {
  BarChart3,
  Briefcase,
  ChevronRight,
  CircleDollarSign,
  Download,
  Flag,
  Home,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Smartphone,
  Ticket,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import {
  ACTIVE_GAME_LABELS,
  SPECTATOR_SCREEN_LABELS,
  SPECTATOR_SCREENS,
  normalizeSuiteState,
  type ActiveGame,
  type SpectatorScreen,
  type SuiteState,
} from "@/lib/suite-state";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { FeudHostPanel } from "@/components/feud/FeudHostPanel";
import { WheelHostPanel } from "@/components/wheel/WheelHostPanel";
import { LiveDrawerHostPanel } from "@/components/live-drawer/LiveDrawerHostPanel";
import { LiveDrawerHeaderSettings } from "@/components/live-drawer/LiveDrawerHeaderSettings";
import { FeudHeaderSettings } from "@/components/feud/FeudHeaderSettings";
import { TakeItOrLeaveItHostPanel } from "@/components/take-it-or-leave-it/TakeItOrLeaveItHostPanel";
import { PollHostPanel } from "@/components/poll/PollHostPanel";
import { MessageBoardHostPanel } from "@/components/message-board/MessageBoardHostPanel";
import { DerbyHostPanel } from "@/components/derby/DerbyHostPanel";
import { PinSettingsPanel } from "@/components/operator/PinSettingsPanel";
import { PinGate } from "@/components/auth/PinGate";

const NAV_TOP: ActiveGame[] = ["idle"];
const NAV_GAMES: ActiveGame[] = ["feud", "wheel", "takeIt", "derby"];
const NAV_TOOLS: ActiveGame[] = ["liveDrawer", "poll", "messageBoard"];

const GAME_ICONS: Record<ActiveGame, LucideIcon> = {
  idle: Home,
  feud: Users,
  wheel: CircleDollarSign,
  liveDrawer: Ticket,
  takeIt: Briefcase,
  derby: Flag,
  poll: BarChart3,
  messageBoard: Megaphone,
};

const GAME_DESCRIPTIONS: Record<Exclude<ActiveGame, "idle">, string> = {
  feud: "Reveal survey answers, track strikes, and run each round.",
  wheel: "Set a phrase and reveal letters on the spectator board.",
  liveDrawer: "Draw colored tokens from the pool for the spectator display.",
  takeIt: "Open nine cases, take banker offers, and decide take it or leave it.",
  derby: "Pick a winner and run a 20-second four-car race on the spectator screen.",
  poll: "Ask a question, open voting on player phones, and show live results.",
  messageBoard: "Put a text announcement on the spectator screen.",
};

function NavItem({
  game,
  active,
  collapsed,
  onSelect,
}: Readonly<{
  game: ActiveGame;
  active: boolean;
  collapsed: boolean;
  onSelect: (game: ActiveGame) => void;
}>) {
  const Icon = GAME_ICONS[game];
  return (
    <button
      type="button"
      onClick={() => onSelect(game)}
      title={collapsed ? ACTIVE_GAME_LABELS[game] : undefined}
      className={`flex w-full items-center rounded-lg py-3 text-left text-sm font-semibold transition-colors ${
        collapsed ? "justify-center px-2" : "gap-3 px-3"
      } ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      <Icon size={19} className="shrink-0" aria-hidden />
      {!collapsed && ACTIVE_GAME_LABELS[game]}
    </button>
  );
}

function OperatorContent() {
  const {
    state,
    setActiveGame,
    setSpectatorGame,
    connected,
  } = useSuite();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const spectatorGame = state.spectatorGame ?? state.activeGame;

  const openSpectator = () => {
    window.open(
      "/spectator",
      "cs_gameshow_spectator",
      "width=1400,height=900",
    );
  };

  const openHostess = () => {
    window.open(
      "/hostess",
      "cs_gameshow_hostess",
      "width=480,height=900",
    );
  };

  const openPlayer = () => {
    window.open(
      "/player",
      "cs_gameshow_player",
      "width=480,height=900",
    );
  };

  const saveSuiteJson = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cs-gameshow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSuiteJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string) as SuiteState;
        const res = await fetch("/api/event", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ import: normalizeSuiteState(parsed) }),
        });
        if (!res.ok) throw new Error("Import failed");
        window.location.reload();
      } catch {
        alert("Failed to load gameshow file. Make sure it is valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <aside
        className={`flex shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 transition-[width] duration-200 ${
          sidebarCollapsed ? "w-16" : "w-64"
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
              <p
                className={`text-xs ${connected ? "text-emerald-400" : "text-amber-400"}`}
              >
                {connected ? "Connected" : "Connecting…"}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} aria-hidden />
            ) : (
              <PanelLeftClose size={20} aria-hidden />
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3">
          {NAV_TOP.map((game) => (
            <NavItem
              key={game}
              game={game}
              active={state.activeGame === game}
              collapsed={sidebarCollapsed}
              onSelect={setActiveGame}
            />
          ))}
          {(
            [
              ["Games", NAV_GAMES],
              ["Tools", NAV_TOOLS],
            ] as const
          ).map(([label, items]) => (
            <div key={label} className="mt-3 flex flex-col gap-1">
              {sidebarCollapsed ? (
                <div className="mx-2 my-1 border-t border-neutral-800" />
              ) : (
                <p className="px-3 pb-1 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                  {label}
                </p>
              )}
              {items.map((game) => (
                <NavItem
                  key={game}
                  game={game}
                  active={state.activeGame === game}
                  collapsed={sidebarCollapsed}
                  onSelect={setActiveGame}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-neutral-800 p-3">
          {!sidebarCollapsed && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                Spectator screen
              </span>
              <select
                value={spectatorGame}
                onChange={(e) =>
                  setSpectatorGame(e.target.value as SpectatorScreen)
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm font-semibold text-white focus:border-sky-500 focus:outline-none"
              >
                {SPECTATOR_SCREENS.map((screen) => (
                  <option key={screen} value={screen}>
                    {SPECTATOR_SCREEN_LABELS[screen]}
                    {screen === "idle" ? " (standby)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {sidebarCollapsed && (
            <select
              value={spectatorGame}
              onChange={(e) =>
                setSpectatorGame(e.target.value as SpectatorScreen)
              }
              title={`Spectator: ${SPECTATOR_SCREEN_LABELS[spectatorGame]}`}
              aria-label="Spectator screen"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-1 py-2 text-center text-xs font-semibold text-white"
            >
              {SPECTATOR_SCREENS.map((screen) => (
                <option key={screen} value={screen}>
                  {SPECTATOR_SCREEN_LABELS[screen]}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={openSpectator}
            title={sidebarCollapsed ? "Open Spectator" : undefined}
            className={`inline-flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 ${
              sidebarCollapsed ? "px-2" : "gap-2 px-4"
            }`}
          >
            <Presentation size={17} className="shrink-0" />
            {!sidebarCollapsed && "Open Spectator"}
          </button>
          <button
            type="button"
            onClick={openHostess}
            title={sidebarCollapsed ? "Open Hostess" : undefined}
            className={`inline-flex w-full items-center justify-center rounded-lg border border-violet-500/50 bg-violet-600/20 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-600/35 ${
              sidebarCollapsed ? "px-2" : "gap-2 px-4"
            }`}
          >
            <UserRound size={17} className="shrink-0" />
            {!sidebarCollapsed && "Open Hostess"}
          </button>
          <button
            type="button"
            onClick={openPlayer}
            title={sidebarCollapsed ? "Open Player" : undefined}
            className={`inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-600/20 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-600/35 ${
              sidebarCollapsed ? "px-2" : "gap-2 px-4"
            }`}
          >
            <Smartphone size={17} className="shrink-0" />
            {!sidebarCollapsed && "Open Player"}
          </button>
          <button
            type="button"
            onClick={() => setShowPinSettings(true)}
            title={sidebarCollapsed ? "PIN Settings" : undefined}
            className={`w-full rounded-lg border border-neutral-700 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 ${
              sidebarCollapsed ? "px-2" : ""
            }`}
          >
            {sidebarCollapsed ? "PIN" : "PIN Settings"}
          </button>
          <div
            className={`flex w-full ${
              sidebarCollapsed ? "flex-col gap-1.5" : "gap-1.5"
            }`}
          >
            <button
              type="button"
              onClick={saveSuiteJson}
              className={`inline-flex items-center justify-center rounded-md border border-neutral-600 bg-neutral-800 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 ${
                sidebarCollapsed ? "h-9 w-full px-2" : "h-9 flex-1 gap-1.5 px-2"
              }`}
            >
              <Download size={14} className="shrink-0" />
              {!sidebarCollapsed && "Save"}
            </button>
            <button
              type="button"
              onClick={() => loadInputRef.current?.click()}
              className={`inline-flex items-center justify-center rounded-md border border-neutral-600 bg-neutral-800 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 ${
                sidebarCollapsed ? "h-9 w-full px-2" : "h-9 flex-1 gap-1.5 px-2"
              }`}
            >
              <Upload size={14} className="shrink-0" />
              {!sidebarCollapsed && "Load"}
            </button>
            <input
              ref={loadInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadSuiteJson(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-900/80 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {ACTIVE_GAME_LABELS[state.activeGame]}
            </h1>
            <p className="text-sm text-neutral-500">
              {state.activeGame === "idle"
                ? "Choose a game to get started"
                : state.activeGame === "poll"
                  ? "Player voting controls"
                  : "Operator controls"}
            </p>
          </div>
          {state.activeGame === "liveDrawer" && <LiveDrawerHeaderSettings />}
          {state.activeGame === "feud" && <FeudHeaderSettings />}
        </header>

        <PinSettingsPanel
          open={showPinSettings}
          onOpenChange={setShowPinSettings}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {state.activeGame === "idle" && (
            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center overflow-auto px-8 py-12">
              <div className="mb-10">
                <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-blue-400 uppercase">
                  Operator Dashboard
                </p>
                <h2 className="font-gameshow text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Welcome to Cash&apos;s Gameshow App
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-400">
                  Choose a game below to open its controls and put it on the
                  spectator display.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    "feud",
                    "wheel",
                    "takeIt",
                    "derby",
                    "liveDrawer",
                    "poll",
                    "messageBoard",
                  ] as const
                ).map((game) => {
                  const Icon = GAME_ICONS[game];
                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => setActiveGame(game)}
                      className="group flex min-h-64 flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-left transition-all hover:-translate-y-1 hover:border-blue-500/70 hover:bg-neutral-800"
                    >
                      <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400 group-hover:bg-blue-600 group-hover:text-white">
                        <Icon size={28} aria-hidden />
                      </span>
                      <span className="text-xl font-bold text-white">
                        {ACTIVE_GAME_LABELS[game]}
                      </span>
                      <span className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
                        {GAME_DESCRIPTIONS[game]}
                      </span>
                      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-blue-400">
                        Open
                        <ChevronRight size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {state.activeGame === "feud" && <FeudHostPanel />}
          {state.activeGame === "wheel" && <WheelHostPanel />}
          {state.activeGame === "liveDrawer" && (
            <div className="min-h-0 flex-1 overflow-auto">
              <LiveDrawerHostPanel />
            </div>
          )}
          {state.activeGame === "takeIt" && (
            <div className="min-h-0 flex-1 overflow-auto">
              <TakeItOrLeaveItHostPanel />
            </div>
          )}
          {state.activeGame === "derby" && (
            <div className="min-h-0 flex-1 overflow-auto">
              <DerbyHostPanel />
            </div>
          )}
          {state.activeGame === "poll" && <PollHostPanel />}
          {state.activeGame === "messageBoard" && (
            <div className="min-h-0 flex-1 overflow-auto">
              <MessageBoardHostPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function OperatorShell() {
  return (
    <PinGate role="operator" title="Operator">
      <SuiteProvider role="operator">
        <TooltipProvider>
          <OperatorContent />
        </TooltipProvider>
      </SuiteProvider>
    </PinGate>
  );
}
