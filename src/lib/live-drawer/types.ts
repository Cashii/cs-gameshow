export type LiveDrawerColor = {
  id: string;
  name: string;
  hex: string;
  /** Number/label color when painted on `hex`. */
  ink: string;
};

export type TokenMark = "birthday" | "vip";

export function normalizeTokenMark(value: unknown): TokenMark | null {
  return value === "birthday" || value === "vip" ? value : null;
}

export type LiveDrawerToken = {
  id: string;
  number: string;
  colorId: string;
  mark: TokenMark | null;
};

export type LiveDrawerSavedToken = {
  number: string;
  colorId: string;
  mark: TokenMark | null;
};

/** One draw, newest first in history. */
export type LiveDrawerDraw = {
  id: string;
  drawnAt: string;
  tokens: LiveDrawerToken[];
};

export type LiveDrawerTimerState = {
  /** When true, a running or paused countdown can appear on the big screen. */
  timerEnabled: boolean;
  timerDurationMs: number;
  timerRemainingMs: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
};

export type LiveDrawerGameState = LiveDrawerTimerState & {
  revealedTokens: LiveDrawerToken[];
  sequence: number;
  /** Scale relative to the default audience text size (1 = current default). */
  numberScale: number;
};

export const DEFAULT_LIVE_DRAWER_NUMBER_SCALE = 1;
export const MIN_LIVE_DRAWER_NUMBER_SCALE = 0.5;
export const MAX_LIVE_DRAWER_NUMBER_SCALE = 1.75;

export const LIVE_DRAWER_DURATION_PRESETS_MS = [
  10_000, 15_000, 20_000, 30_000, 45_000, 60_000, 90_000, 120_000,
] as const;

export const DEFAULT_LIVE_DRAWER_DURATION_MS = 30_000;
export const MIN_LIVE_DRAWER_DURATION_MS = 5_000;
export const MAX_LIVE_DRAWER_DURATION_MS = 10 * 60_000;

const INK_LIGHT = "#ffffff";
const INK_DARK = "#171717";

export const LIVE_DRAWER_COLORS: LiveDrawerColor[] = [
  { id: "red", name: "Red", hex: "#dc2626", ink: INK_LIGHT },
  { id: "blue", name: "Blue", hex: "#2563eb", ink: INK_LIGHT },
  { id: "green", name: "Green", hex: "#16a34a", ink: INK_LIGHT },
  { id: "yellow", name: "Yellow", hex: "#ffd000", ink: INK_DARK },
  { id: "orange", name: "Orange", hex: "#ea580c", ink: INK_LIGHT },
  { id: "purple", name: "Purple", hex: "#9333ea", ink: INK_LIGHT },
  { id: "black", name: "Black", hex: "#111111", ink: INK_LIGHT },
  { id: "white", name: "White", hex: "#f8fafc", ink: INK_DARK },
];

export function createDefaultLiveDrawerState(): LiveDrawerGameState {
  return {
    revealedTokens: [],
    sequence: 0,
    numberScale: DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
    timerEnabled: false,
    timerDurationMs: DEFAULT_LIVE_DRAWER_DURATION_MS,
    timerRemainingMs: DEFAULT_LIVE_DRAWER_DURATION_MS,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function clampLiveDrawerDurationMs(ms: unknown): number {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return DEFAULT_LIVE_DRAWER_DURATION_MS;
  }
  return Math.min(
    MAX_LIVE_DRAWER_DURATION_MS,
    Math.max(MIN_LIVE_DRAWER_DURATION_MS, Math.round(ms)),
  );
}

export function liveDrawerRemainingMs(
  state: Pick<
    LiveDrawerGameState,
    "timerRunning" | "timerEndsAt" | "timerRemainingMs"
  >,
  now = Date.now(),
): number {
  if (state.timerRunning && state.timerEndsAt != null) {
    return Math.max(0, Math.round(state.timerEndsAt - now));
  }
  return Math.max(0, Math.round(state.timerRemainingMs));
}

export function startLiveDrawerTimer(
  state: LiveDrawerGameState,
  now = Date.now(),
): LiveDrawerGameState {
  const remaining = liveDrawerRemainingMs(state, now);
  const nextRemaining = remaining > 0 ? remaining : state.timerDurationMs;
  return {
    ...state,
    timerEnabled: true,
    timerRemainingMs: nextRemaining,
    timerRunning: true,
    timerEndsAt: now + nextRemaining,
  };
}

export function pauseLiveDrawerTimer(
  state: LiveDrawerGameState,
  now = Date.now(),
): LiveDrawerGameState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: liveDrawerRemainingMs(state, now),
    timerEndsAt: null,
  };
}

export function resetLiveDrawerTimer(
  state: LiveDrawerGameState,
): LiveDrawerGameState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: state.timerDurationMs,
    timerEndsAt: null,
  };
}

export function setLiveDrawerDuration(
  state: LiveDrawerGameState,
  durationMs: number,
): LiveDrawerGameState {
  const next = clampLiveDrawerDurationMs(durationMs);
  return {
    ...state,
    timerDurationMs: next,
    timerRemainingMs: next,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function setLiveDrawerTimerEnabled(
  state: LiveDrawerGameState,
  enabled: boolean,
): LiveDrawerGameState {
  if (enabled) return { ...state, timerEnabled: true };
  return pauseLiveDrawerTimer({ ...state, timerEnabled: false });
}

/** Audience clock is hidden until the operator starts it, and stays up through a pause or zero. */
export function liveDrawerTimerOnScreen(state: LiveDrawerGameState): boolean {
  if (!state.timerEnabled) return false;
  if (state.timerRunning) return true;
  return state.timerRemainingMs < state.timerDurationMs;
}

export function formatLiveDrawerClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatLiveDrawerPreset(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = (ms % 60_000) / 1000;
  return seconds ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${minutes}m`;
}

export function clampLiveDrawerNumberScale(value: number): number {
  return Math.min(
    MAX_LIVE_DRAWER_NUMBER_SCALE,
    Math.max(MIN_LIVE_DRAWER_NUMBER_SCALE, Math.round(value * 100) / 100),
  );
}

export function getLiveDrawerColor(
  colorId: string | null,
): LiveDrawerColor | null {
  if (!colorId) return null;
  return LIVE_DRAWER_COLORS.find((c) => c.id === colorId) ?? null;
}

export function liveDrawerFillStyle(
  color: LiveDrawerColor | null | undefined,
): { backgroundColor: string; color: string } {
  return {
    backgroundColor: color?.hex ?? "#334155",
    color: color?.ink ?? INK_LIGHT,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const normalized =
    raw.length === 3 ? raw.split("").map((c) => `${c}${c}`).join("") : raw;
  const n = Number.parseInt(normalized, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function liveDrawerHexLuminance(hex: string): number {
  const [r8, g8, b8] = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r8) + 0.7152 * toLinear(g8) + 0.0722 * toLinear(b8);
}

/** True when `hex` would be unreadable as text on a near-black surface. */
export function liveDrawerNeedsLightSurface(hex: string): boolean {
  return liveDrawerHexLuminance(hex) < 0.08;
}

export function liveDrawerOutlineClass(
  color: LiveDrawerColor | null | undefined,
): string {
  if (color?.id === "white") return "border-2 border-[#475569]";
  if (color?.id === "black") return "border-2 border-[#737373]";
  return "";
}

export type PoolSummary = Record<string, number>;
