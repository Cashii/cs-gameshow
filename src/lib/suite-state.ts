import { createSampleFeudGame } from "@/lib/feud/defaults";
import type { FeudGameState } from "@/lib/feud/types";
import { createDefaultWheelState, type WheelGameState } from "@/lib/wheel/types";
import { createDefaultDrawState, type DrawGameState } from "@/lib/draw/types";

export type ActiveGame = "feud" | "wheel" | "draw" | "idle";

export type SuiteState = {
  activeGame: ActiveGame;
  feud: FeudGameState;
  wheel: WheelGameState;
  draw: DrawGameState;
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
  };
}

export function loadSuiteState(): SuiteState {
  if (typeof window === "undefined") return createDefaultSuiteState();
  try {
    const raw = localStorage.getItem(SUITE_STORAGE_KEY);
    if (!raw) return createDefaultSuiteState();
    const parsed = JSON.parse(raw) as SuiteState;
    return {
      ...createDefaultSuiteState(),
      ...parsed,
      feud: {
        ...createSampleFeudGame(),
        ...parsed.feud,
        showHeader: parsed.feud?.showHeader ?? true,
        rounds: parsed.feud?.rounds?.length
          ? parsed.feud.rounds
          : createSampleFeudGame().rounds,
      },
      wheel: {
        ...createDefaultWheelState(),
        ...parsed.wheel,
        zoom: typeof parsed.wheel?.zoom === "number" ? parsed.wheel.zoom : 1,
      },
      draw: {
        ...createDefaultDrawState(),
        ...parsed.draw,
      },
    };
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
};
