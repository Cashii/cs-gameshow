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
  LayoutGrid,
  Brain,
  Tag,
  ListOrdered,
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
import { JeoparodyHostPanel } from "@/components/jeoparody/JeoparodyHostPanel";
import { TriviaHostPanel } from "@/components/trivia/TriviaHostPanel";
import { PriceGuesserHostPanel } from "@/components/price-guesser/PriceGuesserHostPanel";
import { PriceOrderHostPanel } from "@/components/price-order/PriceOrderHostPanel";
import { PinSettingsPanel } from "@/components/operator/PinSettingsPanel";
import { PinGate } from "@/components/auth/PinGate";

const NAV_TOP: ActiveGame[] = ["idle"];
const NAV_GAMES: ActiveGame[] = [
  "feud",
  "wheel",
  "derby",
  "trivia",
  "priceGuesser",
  "priceOrder",
  "jeoparody",
  "takeIt",
];
const NAV_TOOLS: ActiveGame[] = ["liveDrawer", "poll", "messageBoard"];
const BETA_GAMES: ReadonlySet<ActiveGame> = new Set(["takeIt", "jeoparody"]);

const GAME_ICONS: Record<ActiveGame, LucideIcon> = {
  idle: Home,
  feud: Users,
  wheel: CircleDollarSign,
  liveDrawer: Ticket,
  takeIt: Briefcase,
  derby: Flag,
  jeoparody: LayoutGrid,
  trivia: Brain,
  priceGuesser: Tag,
  priceOrder: ListOrdered,
  poll: BarChart3,
  messageBoard: Megaphone,
};

const CARD_ICON: Record<Exclude<ActiveGame, "idle">, string> = {
  feud: "bg-[#2563eb] text-white",
  wheel: "bg-emerald-500 text-white",
  liveDrawer: "bg-sky-500 text-white",
  takeIt: "bg-red-500 text-white",
  derby: "bg-lime-600 text-white",
  jeoparody: "bg-violet-500 text-white",
  trivia: "bg-cyan-500 text-white",
  priceGuesser: "bg-amber-500 text-white",
  priceOrder: "bg-teal-500 text-white",
  poll: "bg-orange-500 text-white",
  messageBoard: "bg-fuchsia-500 text-white",
};

const NAV_ACTIVE: Record<ActiveGame, string> = {
  idle: "bg-teal-600 text-white",
  ...CARD_ICON,
};

const GAME_DESCRIPTIONS: Record<Exclude<ActiveGame, "idle">, string> = {
  feud: "Reveal survey answers, track strikes, and run each round.",
  wheel: "Set a phrase and reveal letters on the spectator board.",
  liveDrawer: "Draw colored tokens from the pool for the spectator display.",
  takeIt: "Open nine cases, take banker offers, and decide take it or leave it.",
  derby: "Pick a winner and run a 20-second race on the spectator screen.",
  jeoparody: "Set categories and clues, reveal prompts, and score contestants from the operator desk.",
  trivia: "Boolean questions on player phones. Cut the field to any remaining count.",
  priceGuesser: "Show an item photo with a hidden price tag, then reveal the real price.",
  priceOrder: "Put up to five items on screen and build cheapest-to-most-expensive order.",
  poll: "Ask a question, open voting on player phones, and show live results.",
  messageBoard: "Put a text announcement on the spectator screen.",
};

function BetaTag({ compact, inverted }: Readonly<{ compact?: boolean; inverted?: boolean }>) {
  return (
    <span
      className={`shrink-0 rounded-full font-bold tracking-wide uppercase ${
        compact
          ? "px-1 py-px text-[8px]"
          : "px-1.5 py-0.5 text-[10px]"
      } ${
        inverted
          ? "bg-white/20 text-white"
          : "bg-amber-500/15 text-amber-600"
      }`}
    >
      Beta
    </span>
  );
}

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
  const beta = BETA_GAMES.has(game);
  const label = [
    ACTIVE_GAME_LABELS[game],
    beta ? "beta" : null,
    live ? "live" : null,
  ]
    .filter(Boolean)
    .join(" ");
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
          ? `${NAV_ACTIVE[game]} shadow-sm`
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      <span className="relative shrink-0">
        <Icon size={18} strokeWidth={1.5} aria-hidden />
        {live && (
          <span
            className={`absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full ${
              active ? "bg-emerald-300" : "bg-emerald-400"
            } ring-2 ${active ? "ring-white/40" : "ring-neutral-900"}`}
            aria-hidden
          />
        )}
        {beta && collapsed && (
          <span
            className={`absolute -right-1.5 -bottom-1 rounded-full px-0.5 text-[7px] font-bold tracking-wide uppercase ${
              active ? "bg-white/25 text-white" : "bg-amber-500 text-neutral-950"
            }`}
            aria-hidden
          >
            β
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{ACTIVE_GAME_LABELS[game]}</span>
          <span className="flex shrink-0 items-center gap-1">
            {beta && <BetaTag inverted={active} />}
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
  const beta = BETA_GAMES.has(screen);
  const label =
    screen === "idle" ? "Standby" : SPECTATOR_SCREEN_LABELS[screen];
  return (
    <button
      type="button"
      onClick={() => onSelect(screen)}
      aria-label={beta ? `${label} beta` : label}
      aria-current={active ? "true" : undefined}
      className={`flex w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-left font-normal transition-colors ${
        active
          ? `${NAV_ACTIVE[screen]} shadow-sm`
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
      <span className="w-full text-center text-[9px] leading-tight font-medium">
        {label}
      </span>
      {beta && <BetaTag compact inverted={active} />}
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
  const triviaLive = state.trivia.status === "open";

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
    <div className="flex h-screen bg-transparent text-neutral-100">
      <aside
        className={`flex shrink-0 flex-col overflow-visible border-r border-neutral-800 bg-neutral-900 transition-[width] duration-200 ${
          sidebarCollapsed ? "w-12" : "w-60"
        }`}
      >
        <div
          className={`flex items-center overflow-visible border-b border-neutral-800 ${
            sidebarCollapsed
              ? "min-h-16 justify-center px-1.5"
              : "min-h-16 justify-between gap-1.5 px-3 py-3"
          }`}
        >
          {!sidebarCollapsed && (
            <p
              className="min-w-0 whitespace-nowrap py-1.5 text-[1.2rem] leading-none text-teal-600"
              style={{ fontFamily: "var(--font-pacifico), cursive" }}
            >
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
              live={
                (game === "poll" && pollLive) ||
                (game === "trivia" && triviaLive)
              }
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
                  live={
                (game === "poll" && pollLive) ||
                (game === "trivia" && triviaLive)
              }
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-violet-700 hover:bg-violet-100"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">
              {ACTIVE_GAME_LABELS[state.activeGame]}
            </h1>
            {state.activeGame !== "idle" && (
              <p className="text-sm text-neutral-500">
                {state.activeGame === "poll"
                  ? "Player voting controls"
                  : "Operator controls"}
              </p>
            )}
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
            <div className="@container mx-auto w-full max-w-6xl overflow-auto px-6 py-6">
              <div className="mb-6">
                <h2
                  className="text-3xl tracking-tight text-teal-700 sm:text-4xl"
                  style={{ fontFamily: "var(--font-pacifico), cursive" }}
                >
                  Welcome to Cash&apos;s Gameshow App
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                  Choose a game to open its controls and put it on the spectator
                  display.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
                {(
                  [
                    "feud",
                    "wheel",
                    "derby",
                    "trivia",
                    "priceGuesser",
                    "priceOrder",
                    "jeoparody",
                    "takeIt",
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
                      className="group flex h-full flex-col rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CARD_ICON[game]}`}
                        >
                          <Icon size={20} aria-hidden />
                        </span>
                        <span className="flex min-w-0 items-center gap-2 text-base font-bold text-white">
                          {ACTIVE_GAME_LABELS[game]}
                          {BETA_GAMES.has(game) && <BetaTag />}
                          {((game === "poll" && pollLive) ||
                            (game === "trivia" && triviaLive)) && (
                            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-400 uppercase">
                              Live
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="mt-2 flex-1 text-sm leading-snug text-neutral-400">
                        {GAME_DESCRIPTIONS[game]}
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600">
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
          {state.activeGame === "liveDrawer" && <LiveDrawerHostPanel />}
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
          {state.activeGame === "jeoparody" && <JeoparodyHostPanel />}
          {state.activeGame === "trivia" && <TriviaHostPanel />}
          {state.activeGame === "priceGuesser" && <PriceGuesserHostPanel />}
          {state.activeGame === "priceOrder" && <PriceOrderHostPanel />}
          {state.activeGame === "poll" && <PollHostPanel />}
          {state.activeGame === "messageBoard" && (
            <div className="min-h-0 flex-1 overflow-auto">
              <MessageBoardHostPanel />
            </div>
          )}
        </main>
      </div>

      <aside className="flex h-full min-h-0 w-20 shrink-0 flex-col overflow-hidden border-l border-neutral-800 bg-neutral-900">
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
