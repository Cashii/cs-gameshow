"use client";

import {
  BarChart3,
  Briefcase,
  CircleDollarSign,
  Download,
  Flag,
  Home,
  KeyRound,
  Megaphone,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Settings,
  Smartphone,
  Sun,
  Ticket,
  Upload,
  UserRound,
  Users,
  LayoutGrid,
  Brain,
  Tag,
  ListOrdered,
  Heart,
  Pencil,
  ScrollText,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { QuestionTimeHostPanel } from "@/components/question-time/QuestionTimeHostPanel";
import { PictionaryHostPanel } from "@/components/pictionary/PictionaryHostPanel";
import { PinSettingsPanel } from "@/components/operator/PinSettingsPanel";
import { NAV_ACTIVE } from "@/components/operator/gameIconTheme";
import { PinGate } from "@/components/auth/PinGate";
import { useStudioTheme } from "@/components/studio/StudioTheme";
import { GameshowLogo } from "@/components/studio/GameshowLogo";
import { ChangelogItemIcons } from "@/components/operator/changelogIcons";
import { parseChangelogMarkdown } from "@/lib/changelog";

const NAV_TOP: ActiveGame[] = ["idle"];
const NAV_GAMES: ActiveGame[] = [
  "feud",
  "wheel",
  "derby",
  "trivia",
  "priceGuesser",
  "priceOrder",
  "questionTime",
  "pictionary",
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
  questionTime: Heart,
  poll: BarChart3,
  messageBoard: Megaphone,
  pictionary: Pencil,
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
      className={`flex w-full flex-col items-center justify-center gap-1 rounded-md px-1.5 py-2 text-left font-normal transition-colors ${
        active
          ? `${NAV_ACTIVE[screen]} shadow-sm`
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
      <span className="w-full text-center text-[10px] leading-tight font-medium">
        {label}
      </span>
      {beta && <BetaTag compact inverted={active} />}
    </button>
  );
}

function OperatorContent({
  changelogMarkdown,
}: Readonly<{ changelogMarkdown: string }>) {
  const {
    state,
    setActiveGame,
    setSpectatorGame,
  } = useSuite();
  const { theme, setTheme } = useStudioTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const spectatorGame = state.spectatorGame ?? state.activeGame;
  const pollLive = state.poll.status === "open";
  const triviaLive = state.trivia.status === "open";
  const latestUpdate = parseChangelogMarkdown(changelogMarkdown).sections[0];

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
          className={`flex h-14 shrink-0 items-center overflow-visible border-b border-neutral-800 ${
            sidebarCollapsed
              ? "justify-center px-1.5"
              : "justify-between gap-1.5 px-3"
          }`}
        >
          {!sidebarCollapsed && (
            <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap leading-none">
              <span
                className="text-[1.25rem] text-[#3dff8a]"
                style={{ fontFamily: "var(--font-pacifico), cursive" }}
              >
                Jack&apos;d
              </span>
              <span className="font-gameshow text-[1.05rem] text-[#c084fc]">
                UP
              </span>
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
          <Link
            href="/operator/updates"
            aria-label="Updates"
            title={sidebarCollapsed ? "Updates" : undefined}
            className={`mb-0.5 flex w-full items-center rounded-md py-2 text-left text-base font-normal text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 ${
              sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
            }`}
          >
            <ScrollText size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
            {!sidebarCollapsed && <span className="truncate">Updates</span>}
          </Link>
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
                    setTheme(theme === "dark" ? "light" : "dark");
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
                >
                  {theme === "dark" ? (
                    <Sun size={16} className="shrink-0" />
                  ) : (
                    <Moon size={16} className="shrink-0" />
                  )}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    openHostess();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-violet-300 hover:bg-violet-500/15"
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
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15"
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
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-900 px-6">
          <div className="min-w-0 leading-tight">
            <h1 className="text-lg font-bold text-white">
              {ACTIVE_GAME_LABELS[state.activeGame]}
            </h1>
            {state.activeGame === "poll" && (
              <p className="text-sm text-neutral-500">Player voting controls</p>
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
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="mx-auto -mt-16 flex w-full max-w-4xl flex-col px-6 pb-6 pt-2">
                <div className="pointer-events-none relative mx-auto h-96 w-full max-w-xl overflow-hidden">
                  <GameshowLogo className="h-full w-full" zoom={1.15} />
                </div>

                <div className="relative z-10 mt-6 w-full">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <h2 className="text-base font-bold text-white">Games</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                        Use the list on the left to pick the game you&apos;re
                        running. That opens the controls for that game on this
                        desk.
                      </p>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        Spectator screen
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                        The rail on the right chooses what the audience sees. It
                        can stay on standby or show a different game than the one
                        you&apos;re controlling.
                      </p>
                    </div>
                  </div>

                  <h2 className="mt-8 text-center text-base font-bold text-white">
                    Screens
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={openHostess}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
                    >
                      <UserRound size={16} aria-hidden />
                      Hostess
                    </button>
                    <button
                      type="button"
                      onClick={openPlayer}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      <Smartphone size={16} aria-hidden />
                      Player
                    </button>
                    <button
                      type="button"
                      onClick={openSpectator}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
                    >
                      <Presentation size={16} aria-hidden />
                      Spectator
                    </button>
                  </div>

                  {latestUpdate ? (
                    <div className="mt-8 border-t border-neutral-800 pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <p className="min-w-0 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                          Latest update · {latestUpdate.date}
                        </p>
                        <Link
                          href="/operator/updates"
                          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-400 transition-colors hover:text-teal-300"
                        >
                          View all updates
                          <ArrowRight size={14} aria-hidden />
                        </Link>
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-neutral-400">
                        {latestUpdate.items.map((item) => (
                          <li key={`${latestUpdate.date}-${item.title}`}>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold text-neutral-200">
                                {item.title}
                              </span>
                              <ChangelogItemIcons item={item} />
                            </div>
                            {item.detail ? (
                              <p className="mt-0.5 leading-5">{item.detail}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
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
          {state.activeGame === "derby" && <DerbyHostPanel />}
          {state.activeGame === "jeoparody" && <JeoparodyHostPanel />}
          {state.activeGame === "trivia" && <TriviaHostPanel />}
          {state.activeGame === "priceGuesser" && <PriceGuesserHostPanel />}
          {state.activeGame === "priceOrder" && <PriceOrderHostPanel />}
          {state.activeGame === "questionTime" && <QuestionTimeHostPanel />}
          {state.activeGame === "poll" && <PollHostPanel />}
          {state.activeGame === "messageBoard" && (
            <div className="min-h-0 flex-1 overflow-auto">
              <MessageBoardHostPanel />
            </div>
          )}
          {state.activeGame === "pictionary" && <PictionaryHostPanel />}
        </main>
      </div>

      <aside className="flex h-full min-h-0 w-30 shrink-0 flex-col overflow-hidden border-l border-neutral-800 bg-neutral-900">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-neutral-800 px-2">
          <h2 className="text-center text-[11px] font-bold leading-tight text-white">
            Spectator Screen
          </h2>
        </div>
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
            className="inline-flex w-full flex-col items-center justify-center gap-1 rounded-md bg-teal-600 px-1.5 py-2 font-normal text-white hover:bg-teal-500"
          >
            <Presentation size={18} strokeWidth={1.5} className="shrink-0" />
            <span className="w-full text-center text-[10px] leading-tight font-medium">
              Open Spectator
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}

export function OperatorShell({
  changelogMarkdown = "",
}: Readonly<{ changelogMarkdown?: string }>) {
  return (
    <PinGate role="operator" title="Operator">
      <SuiteProvider role="operator">
        <TooltipProvider>
          <OperatorContent changelogMarkdown={changelogMarkdown} />
        </TooltipProvider>
      </SuiteProvider>
    </PinGate>
  );
}
