export type LiveDrawerColor = {
  id: string;
  name: string;
  hex: string;
};

export type LiveDrawerGameState = {
  number: string | null;
  colorId: string | null;
  sequence: number;
  /** Scale relative to the default audience text size (1 = current default). */
  numberScale: number;
};

export const DEFAULT_LIVE_DRAWER_NUMBER_SCALE = 1;
export const MIN_LIVE_DRAWER_NUMBER_SCALE = 0.5;
export const MAX_LIVE_DRAWER_NUMBER_SCALE = 1.75;

export const LIVE_DRAWER_COLORS: LiveDrawerColor[] = [
  { id: "red", name: "Red", hex: "#dc2626" },
  { id: "blue", name: "Blue", hex: "#2563eb" },
  { id: "green", name: "Green", hex: "#16a34a" },
  { id: "yellow", name: "Yellow", hex: "#ca8a04" },
  { id: "purple", name: "Purple", hex: "#9333ea" },
  { id: "orange", name: "Orange", hex: "#ea580c" },
  { id: "pink", name: "Pink", hex: "#db2777" },
  { id: "teal", name: "Teal", hex: "#0d9488" },
];

export function createDefaultLiveDrawerState(): LiveDrawerGameState {
  return {
    number: null,
    colorId: null,
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
