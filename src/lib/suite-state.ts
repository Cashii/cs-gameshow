import { createSampleFeudGame } from "@/lib/feud/defaults";
import type { FeudGameState } from "@/lib/feud/types";
import { createDefaultWheelState, type WheelGameState } from "@/lib/wheel/types";
import {
  createDefaultLiveDrawerState,
  clampLiveDrawerNumberScale,
  DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
  type LiveDrawerGameState,
} from "@/lib/live-drawer/types";
import {
  createDefaultTakeItState,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";

export type ActiveGame = "feud" | "wheel" | "liveDrawer" | "takeIt" | "idle";

export type SuiteState = {
  activeGame: ActiveGame;
  audienceCovered: boolean;
  feud: FeudGameState;
  wheel: WheelGameState;
  liveDrawer: LiveDrawerGameState;
  takeIt: TakeItGameState;
};

type LegacySuiteState = Partial<Omit<SuiteState, "activeGame" | "liveDrawer">> & {
  activeGame?: ActiveGame | "deal" | "draw";
  draw?: LiveDrawerGameState & { colors?: unknown };
  liveDrawer?: LiveDrawerGameState & { colors?: unknown };
  deal?: TakeItGameState & { dealAccepted?: boolean | null };
};

export const SUITE_STORAGE_KEY = "cs_gameshow_suite_v1";
export const SUITE_SYNC_CHANNEL = "cs_gameshow_sync";
export const SUITE_FALLBACK_KEY = "cs_gameshow_last_state";

export function createDefaultSuiteState(): SuiteState {
  return {
    activeGame: "idle",
    audienceCovered: true,
    feud: createSampleFeudGame(),
    wheel: createDefaultWheelState(),
    liveDrawer: createDefaultLiveDrawerState(),
    takeIt: createDefaultTakeItState(),
  };
}

function normalizeTakeItState(
  raw: LegacySuiteState["takeIt"] | LegacySuiteState["deal"] | undefined,
): TakeItGameState {
  const defaults = createDefaultTakeItState();
  if (!raw) return defaults;

  const legacyAccepted =
    "dealAccepted" in raw ? raw.dealAccepted : undefined;

  return {
    ...defaults,
    ...raw,
    values: raw.values?.length === 9 ? raw.values : defaults.values,
    cases: Array.isArray(raw.cases) ? raw.cases : defaults.cases,
    tookIt:
      typeof raw.tookIt === "boolean" || raw.tookIt === null
        ? raw.tookIt
        : typeof legacyAccepted === "boolean" || legacyAccepted === null
          ? legacyAccepted
          : defaults.tookIt,
  };
}

function normalizeLiveDrawerState(
  raw: LegacySuiteState["liveDrawer"] | LegacySuiteState["draw"] | undefined,
): LiveDrawerGameState {
  const defaults = createDefaultLiveDrawerState();
  if (!raw) return defaults;
  const { colors: _ignored, ...rest } = raw;
  return {
    ...defaults,
    ...rest,
    colorId: rest.colorId ?? null,
    numberScale:
      typeof rest.numberScale === "number"
        ? clampLiveDrawerNumberScale(rest.numberScale)
        : DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
  };
}

export function normalizeSuiteState(
  raw: LegacySuiteState | null | undefined,
): SuiteState {
  const defaults = createDefaultSuiteState();
  if (!raw || typeof raw !== "object") return defaults;

  const activeGame: ActiveGame =
    raw.activeGame === "deal"
      ? "takeIt"
      : raw.activeGame === "draw"
        ? "liveDrawer"
        : ((raw.activeGame as ActiveGame | undefined) ?? defaults.activeGame);

  const { draw: _legacyDraw, ...rawWithoutDraw } = raw;

  return {
    ...defaults,
    ...rawWithoutDraw,
    activeGame,
    audienceCovered: raw.audienceCovered ?? defaults.audienceCovered,
    feud: {
      ...createSampleFeudGame(),
      ...raw.feud,
      showHeader: raw.feud?.showHeader ?? true,
      leftTeam: {
        name: raw.feud?.leftTeam?.name ?? "Left",
        score:
          typeof raw.feud?.leftTeam?.score === "number"
            ? raw.feud.leftTeam.score
            : 0,
      },
      rightTeam: {
        name: raw.feud?.rightTeam?.name ?? "Right",
        score:
          typeof raw.feud?.rightTeam?.score === "number"
            ? raw.feud.rightTeam.score
            : 0,
      },
      showTeamScores: raw.feud?.showTeamScores ?? true,
      showAnswerScores: raw.feud?.showAnswerScores ?? true,
      rounds: raw.feud?.rounds?.length
        ? raw.feud.rounds
        : createSampleFeudGame().rounds,
    },
    wheel: {
      ...createDefaultWheelState(),
      ...raw.wheel,
      zoom: typeof raw.wheel?.zoom === "number" ? raw.wheel.zoom : 1,
      showLetterLegend: raw.wheel?.showLetterLegend ?? true,
    },
    liveDrawer: normalizeLiveDrawerState(raw.liveDrawer ?? raw.draw),
    takeIt: normalizeTakeItState(raw.takeIt ?? raw.deal),
  };
}

export function loadSuiteState(): SuiteState {
  if (typeof window === "undefined") return createDefaultSuiteState();
  try {
    const raw = localStorage.getItem(SUITE_STORAGE_KEY);
    if (!raw) return createDefaultSuiteState();
    return normalizeSuiteState(JSON.parse(raw) as LegacySuiteState);
  } catch {
    return createDefaultSuiteState();
  }
}

export function saveSuiteState(state: SuiteState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUITE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export const ACTIVE_GAME_LABELS: Record<ActiveGame, string> = {
  idle: "Home",
  feud: "Friendly Feud",
  wheel: "Wheel of Riches",
  liveDrawer: "Live Drawer",
  takeIt: "Take It or Leave It",
};
