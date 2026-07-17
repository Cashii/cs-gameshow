export type TakeItPhase =
  | "setup"
  | "pick"
  | "playing"
  | "offer"
  | "final"
  | "revealed";

export type TakeItCase = {
  id: number;
  value: number;
  opened: boolean;
};

export type TakeItGameState = {
  phase: TakeItPhase;
  values: number[];
  cases: TakeItCase[];
  playerCaseId: number | null;
  offerAmount: number | null;
  lastOpenedCaseId: number | null;
  tookIt: boolean | null;
};

export const DEFAULT_TAKE_IT_VALUES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

export function createDefaultTakeItState(): TakeItGameState {
  return {
    phase: "setup",
    values: [...DEFAULT_TAKE_IT_VALUES],
    cases: [],
    playerCaseId: null,
    offerAmount: null,
    lastOpenedCaseId: null,
    tookIt: null,
  };
}
