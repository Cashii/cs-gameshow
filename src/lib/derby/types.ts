export const DERBY_RACER_IDS = ["red", "blue", "green", "yellow"] as const;
export type DerbyRacerId = (typeof DERBY_RACER_IDS)[number];

export type DerbyPhase = "idle" | "racing" | "finished";

export const DERBY_THEMES = ["wonderbar", "horses"] as const;
export type DerbyTheme = (typeof DERBY_THEMES)[number];

export type DerbyRacer = {
  id: DerbyRacerId;
  name: string;
  number: number;
  hex: string;
  hexDark: string;
};

export const DERBY_RACERS: DerbyRacer[] = [
  { id: "red", name: "Red", number: 1, hex: "#ef4444", hexDark: "#b91c1c" },
  { id: "blue", name: "Blue", number: 2, hex: "#3b82f6", hexDark: "#1d4ed8" },
  { id: "green", name: "Green", number: 3, hex: "#22c55e", hexDark: "#15803d" },
  { id: "yellow", name: "Yellow", number: 4, hex: "#eab308", hexDark: "#a16207" },
];

export const WONDERBAR_RACERS: DerbyRacer[] = [
  { id: "red", name: "Magenta", number: 1, hex: "#f472b6", hexDark: "#be185d" },
  { id: "blue", name: "Aqua", number: 2, hex: "#22d3ee", hexDark: "#0e7490" },
  { id: "green", name: "Lime", number: 3, hex: "#a3e635", hexDark: "#4d7c0f" },
  { id: "yellow", name: "Gold", number: 4, hex: "#facc15", hexDark: "#a16207" },
];

export const DERBY_THEME_OPTIONS: { value: DerbyTheme; label: string }[] = [
  { value: "wonderbar", label: "Wonderbar's Dildo Derby" },
  { value: "horses", label: "Kentucky Derby" },
];

export const DERBY_DURATION_MS = 20_000;
export const DEFAULT_DERBY_RACER_SCALE = 1;
export const MIN_DERBY_RACER_SCALE = 0.6;
export const MAX_DERBY_RACER_SCALE = 2.5;

export type DerbyGameState = {
  phase: DerbyPhase;
  theme: DerbyTheme;
  /** Spectator sprite size. 1 is the default horse/toy size. */
  racerScale: number;
  /** Operator pick — do not show on spectator until finished. */
  winnerId: DerbyRacerId | null;
  /** Stable id for a single race (later bets / certificates). */
  raceId: string | null;
  startedAt: number | null;
  durationMs: number;
  seed: number;
  sequence: number;
};

export function createDefaultDerbyState(): DerbyGameState {
  return {
    phase: "idle",
    theme: "wonderbar",
    racerScale: DEFAULT_DERBY_RACER_SCALE,
    winnerId: null,
    raceId: null,
    startedAt: null,
    durationMs: DERBY_DURATION_MS,
    seed: 0,
    sequence: 0,
  };
}

export function isDerbyRacerId(value: unknown): value is DerbyRacerId {
  return (
    typeof value === "string" &&
    (DERBY_RACER_IDS as readonly string[]).includes(value)
  );
}

export function isDerbyTheme(value: unknown): value is DerbyTheme {
  return value === "horses" || value === "wonderbar";
}

export function getDerbyRacers(theme: DerbyTheme = "wonderbar"): DerbyRacer[] {
  return theme === "wonderbar" ? WONDERBAR_RACERS : DERBY_RACERS;
}

export function getDerbyRacer(
  id: DerbyRacerId,
  theme: DerbyTheme = "wonderbar",
): DerbyRacer {
  const racer = getDerbyRacers(theme).find((item) => item.id === id);
  if (!racer) throw new Error(`Unknown derby racer: ${id}`);
  return racer;
}

export function getDerbyTheme(game: { theme?: DerbyTheme | null }): DerbyTheme {
  return isDerbyTheme(game.theme) ? game.theme : "wonderbar";
}

export function clampDerbyRacerScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DERBY_RACER_SCALE;
  }
  return Math.min(
    MAX_DERBY_RACER_SCALE,
    Math.max(MIN_DERBY_RACER_SCALE, Math.round(value * 100) / 100),
  );
}
