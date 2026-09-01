export type LiveDrawerColor = {
  id: string;
  name: string;
  hex: string;
  /** Number/label color when painted on `hex`. */
  ink: string;
};

export type LiveDrawerToken = {
  id: string;
  number: string;
  colorId: string;
};

export type LiveDrawerGameState = {
  revealedTokens: LiveDrawerToken[];
  sequence: number;
  /** Scale relative to the default audience text size (1 = current default). */
  numberScale: number;
};

export const DEFAULT_LIVE_DRAWER_NUMBER_SCALE = 1;
export const MIN_LIVE_DRAWER_NUMBER_SCALE = 0.5;
export const MAX_LIVE_DRAWER_NUMBER_SCALE = 1.75;

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
  };
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
