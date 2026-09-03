export type TakeItPhase = "setup" | "pick" | "playing";

export type TakeItCard = "green" | "red";

export type TakeItCase = {
  id: number;
  card: TakeItCard;
  opened: boolean;
};

export type TakeItGameState = {
  phase: TakeItPhase;
  /** Setup deck — green = keep playing, red = eliminated. */
  cards: TakeItCard[];
  cases: TakeItCase[];
  /** Voting / pick window id. */
  roundId: string | null;
  lastOpenedCaseId: number | null;
  /** How many phones claimed each case id (string keys). */
  pickCounts: Record<string, number>;
};

export const MIN_TAKE_IT_CASES = 3;
export const MAX_TAKE_IT_CASES = 16;

export const DEFAULT_TAKE_IT_CARDS: TakeItCard[] = [
  "green",
  "green",
  "green",
  "green",
  "green",
  "red",
  "red",
  "red",
  "red",
];

export function createDefaultTakeItState(): TakeItGameState {
  return {
    phase: "setup",
    cards: [...DEFAULT_TAKE_IT_CARDS],
    cases: [],
    roundId: null,
    lastOpenedCaseId: null,
    pickCounts: {},
  };
}

export function isTakeItCard(value: unknown): value is TakeItCard {
  return value === "green" || value === "red";
}

export function emptyTakeItPickCounts(): Record<string, number> {
  return {};
}

export function clampTakeItCaseCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_TAKE_IT_CARDS.length;
  return Math.min(
    MAX_TAKE_IT_CASES,
    Math.max(MIN_TAKE_IT_CASES, Math.round(count)),
  );
}

export function takeItGridColumns(caseCount: number): number {
  const n = Math.max(1, caseCount);
  return Math.max(2, Math.ceil(Math.sqrt(n)));
}

export function takeItCardLabel(card: TakeItCard): string {
  return card === "green" ? "Keep playing" : "Eliminated";
}
