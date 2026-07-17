import { createSampleFeudGame } from "@/lib/feud/defaults";
import type { FeudGameState } from "@/lib/feud/types";
import { createDefaultWheelState, type WheelGameState } from "@/lib/wheel/types";
import { createDefaultDrawState, type DrawGameState } from "@/lib/draw/types";
import {
  createDefaultTakeItState,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";

export type ActiveGame = "feud" | "wheel" | "draw" | "takeIt" | "idle";

export type SuiteState = {
  activeGame: ActiveGame;
  feud: FeudGameState;
  wheel: WheelGameState;
  draw: DrawGameState;
  takeIt: TakeItGameState;
};

type LegacySuiteState = Partial<Omit<SuiteState, "activeGame">> & {
  activeGame?: ActiveGame | "deal";
  deal?: TakeItGameState & { dealAccepted?: boolean | null };
};

export const SUITE_STORAGE_KEY = "cs_gameshow_suite_v1";
export const SUITE_SYNC_CHANNEL = "cs_gameshow_sync";
export const SUITE_FALLBACK_KEY = "cs_gameshow_last_state";

export function createDefaultSuiteState(): SuiteState {
  return {
    activeGame: "idle",
    feud: createSampleFeudGame(),
    wheel: createDefaultWheelState(),
    draw: createDefaultDrawState(),
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

export function normalizeSuiteState(
  raw: LegacySuiteState | null | undefined,
): SuiteState {
  const defaults = createDefaultSuiteState();
  if (!raw || typeof raw !== "object") return defaults;

  const activeGame: ActiveGame =
    raw.activeGame === "deal"
      ? "takeIt"
      : ((raw.activeGame as ActiveGame | undefined) ?? defaults.activeGame);

  return {
    ...defaults,
    ...raw,
    activeGame,
    feud: {
      ...createSampleFeudGame(),
      ...raw.feud,
      showHeader: raw.feud?.showHeader ?? true,
      rounds: raw.feud?.rounds?.length
        ? raw.feud.rounds
        : createSampleFeudGame().rounds,
    },
    wheel: {
      ...createDefaultWheelState(),
      ...raw.wheel,
      zoom: typeof raw.wheel?.zoom === "number" ? raw.wheel.zoom : 1,
    },
    draw: {
      ...createDefaultDrawState(),
      ...raw.draw,
    },
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
  draw: "Number Draw",
  takeIt: "Take It or Leave It",
};
