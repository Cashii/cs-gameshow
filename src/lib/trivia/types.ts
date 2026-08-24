export type TriviaStatus =
  | "idle"
  | "open"
  | "locked"
  | "revealed"
  | "finished";

export type TriviaChoiceId = "a" | "b";

export type TriviaPlayerRole = "none" | "active" | "eliminated";

export type TriviaMe = {
  role: TriviaPlayerRole;
  canVote: boolean;
  voted: boolean;
  choiceId: TriviaChoiceId | null;
  remainingCount: number;
  winner: boolean;
};

export type TriviaGameState = {
  status: TriviaStatus;
  roundId: string;
  roundIndex: number;
  question: string;
  optionA: string;
  optionB: string;
  survivingChoiceId: TriviaChoiceId | null;
  answeredCount: number;
  choiceACount: number;
  choiceBCount: number;
  remainingCount: number;
  fieldSize: number;
  winnerCodes: string[];
};

export function createDefaultTriviaState(): TriviaGameState {
  return {
    status: "idle",
    roundId: "",
    roundIndex: 0,
    question: "",
    optionA: "True",
    optionB: "False",
    survivingChoiceId: null,
    answeredCount: 0,
    choiceACount: 0,
    choiceBCount: 0,
    remainingCount: 0,
    fieldSize: 0,
    winnerCodes: [],
  };
}

export function isTriviaChoiceId(value: unknown): value is TriviaChoiceId {
  return value === "a" || value === "b";
}
