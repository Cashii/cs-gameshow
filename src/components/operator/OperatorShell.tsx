"use client";

import {
  BarChart3,
  Briefcase,
  ChevronRight,
  CircleDollarSign,
  Download,
  Flag,
  Home,
  KeyRound,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Settings,
  Smartphone,
  Ticket,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  derby: "Pick a winner and run a 20-second four-horse race on the spectator screen.",
  poll: "Ask a question, open voting on player phones, and show live results.",
  messageBoard: "Put a text announcement on the spectator screen.",
};

function NavItem({
  game,
  active,
  collapsed,
  live,
  onSelect,
}: Readonly<{
  game: ActiveGame;
  active: boolean;
  collapsed: boolean;
  live?: boolean;
  onSelect: (game: ActiveGame) => void;
}>) {
  const Icon = GAME_ICONS[game];
  const label = live
    ? `${ACTIVE_GAME_LABELS[game]} (live)`
    : ACTIVE_GAME_LABELS[game];
  return (
    <button
      type="button"
      onClick={() => onSelect(game)}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`flex w-full items-center rounded-md py-2 text-left text-base font-normal transition-colors ${
        collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
      } ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      <span className="relative shrink-0">
        <Icon size={18} strokeWidth={1.5} aria-hidden />
        {live && (
          <span
            className={`absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full ${
              active ? "bg-emerald-300" : "bg-emerald-400"
            } ring-2 ${active ? "ring-blue-600" : "ring-neutral-900"}`}
            aria-hidden
          />
        )}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{ACTIVE_GAME_LABELS[game]}</span>
          {live && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                active
                  ? "bg-white/20 text-white"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              Live
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function SpectatorNavItem({
  screen,
  active,
  onSelect,
}: Readonly<{
  screen: SpectatorScreen;
  active: boolean;
  onSelect: (screen: SpectatorScreen) => void;
}>) {
  const Icon = GAME_ICONS[screen];
  const label =
    screen === "idle" ? "Standby" : SPECTATOR_SCREEN_LABELS[screen];
  return (
    <button
      type="button"
      onClick={() => onSelect(screen)}
      aria-label={label}
      aria-current={active ? "true" : undefined}
      className={`flex w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-left font-normal transition-colors ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
      <span className="w-full text-center text-[9px] leading-tight font-medium">
        {label}
      </span>
    </button>
  );
}

function OperatorContent() {
  const {
    state,
    setActiveGame,
    setSpectatorGame,
  } = useSuite();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const spectatorGame = state.spectatorGame ?? state.activeGame;
  const pollLive = state.poll.status === "open";

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [settingsOpen]);

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
          sidebarCollapsed ? "w-12" : "w-52"
        }`}
      >
        <div
          className={`flex min-h-16 items-center border-b border-neutral-800 ${
            sidebarCollapsed
              ? "justify-center px-1.5"
              : "justify-between gap-2 px-3 py-2"
          }`}
        >
          {!sidebarCollapsed && (
            <p className="font-gameshow min-w-0 truncate text-xl font-bold leading-tight tracking-wide text-white">
              Cash&apos;s Gameshow
            </p>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.5} aria-hidden />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-auto p-2">
          {NAV_TOP.map((game) => (
            <NavItem
              key={game}
              game={game}
              active={state.activeGame === game}
              collapsed={sidebarCollapsed}
              live={game === "poll" && pollLive}
              onSelect={setActiveGame}
            />
          ))}
          {(
            [
              ["Games", NAV_GAMES],
              ["Tools", NAV_TOOLS],
            ] as const
          ).map(([label, items]) => (
            <div key={label} className="mt-2 flex flex-col gap-0.5">
              {sidebarCollapsed ? (
                <div className="mx-1.5 my-1 border-t border-neutral-800" />
              ) : (
                <p className="px-2 pb-0.5 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                  {label}
                </p>
              )}
              {items.map((game) => (
                <NavItem
                  key={game}
                  game={game}
                  active={state.activeGame === game}
                  collapsed={sidebarCollapsed}
                  live={game === "poll" && pollLive}
                  onSelect={setActiveGame}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-neutral-800 p-2">
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
              aria-label="Settings"
              title={sidebarCollapsed ? "Settings" : undefined}
              className={`flex w-full items-center rounded-md py-2 text-left text-base font-normal transition-colors ${
                sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
              } ${
                settingsOpen
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              }`}
            >
              <Settings size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              {!sidebarCollapsed && <span className="truncate">Settings</span>}
            </button>
            {settingsOpen && (
              <div
                role="menu"
                className={`absolute z-50 min-w-48 rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl ${
                  sidebarCollapsed
                    ? "bottom-0 left-full ml-1.5"
                    : "right-0 bottom-full mb-1.5 w-full"
                }`}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    saveSuiteJson();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-200 hover:bg-neutral-800"
                >
                  <Download size={16} className="shrink-0" />
                  Save
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    loadInputRef.current?.click();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-200 hover:bg-neutral-800"
                >
                  <Upload size={16} className="shrink-0" />
                  Load
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    openHostess();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-violet-100 hover:bg-violet-600/30"
                >
                  <UserRound size={16} className="shrink-0" />
                  Open Hostess
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    openPlayer();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-emerald-100 hover:bg-emerald-600/30"
                >
                  <Smartphone size={16} className="shrink-0" />
                  Open Player
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowPinSettings(true);
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-200 hover:bg-neutral-800"
                >
                  <KeyRound size={16} className="shrink-0" />
                  PIN Settings
                </button>
              </div>
            )}
          </div>
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
                      <span className="flex items-center gap-2 text-xl font-bold text-white">
                        {ACTIVE_GAME_LABELS[game]}
                        {game === "poll" && pollLive && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-400 uppercase">
                            Live
                          </span>
                        )}
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

      <aside className="flex w-20 shrink-0 flex-col border-l border-neutral-800 bg-neutral-900">
        <nav className="flex flex-1 flex-col gap-0.5 overflow-auto p-2">
          {SPECTATOR_SCREENS.map((screen) => (
            <SpectatorNavItem
              key={screen}
              screen={screen}
              active={spectatorGame === screen}
              onSelect={setSpectatorGame}
            />
          ))}
        </nav>

        <div className="border-t border-neutral-800 p-2">
          <button
            type="button"
            onClick={openSpectator}
            className="inline-flex w-full flex-col items-center justify-center gap-1 rounded-md bg-blue-600 px-1 py-2 font-normal text-white hover:bg-blue-500"
          >
            <Presentation size={18} strokeWidth={1.5} className="shrink-0" />
            <span className="w-full text-center text-[9px] leading-tight font-medium">
              Open Spectator
            </span>
          </button>
        </div>
      </aside>
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
