export const DERBY_RACER_IDS = ["red", "blue", "green", "yellow"] as const;
export type DerbyRacerId = (typeof DERBY_RACER_IDS)[number];

export type DerbyPhase = "idle" | "racing" | "finished";

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

export const DERBY_DURATION_MS = 20_000;

export type DerbyGameState = {
  phase: DerbyPhase;
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

export function getDerbyRacer(id: DerbyRacerId): DerbyRacer {
  const racer = DERBY_RACERS.find((item) => item.id === id);
  if (!racer) throw new Error(`Unknown derby racer: ${id}`);
  return racer;
}
