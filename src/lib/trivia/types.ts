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

export type TriviaQueuedQuestion = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
};

export type TriviaRoundHistory = {
  roundIndex: number;
  roundId: string;
  question: string;
  optionA: string;
  optionB: string;
  survivingChoiceId: TriviaChoiceId | null;
  choiceACount: number;
  choiceBCount: number;
  remainingCount: number;
  answeredCount: number;
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
  queue: TriviaQueuedQuestion[];
  history: TriviaRoundHistory[];
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
    queue: [],
    history: [],
  };
}

export function isTriviaChoiceId(value: unknown): value is TriviaChoiceId {
  return value === "a" || value === "b";
}

export function createTriviaQueuedQuestion(
  partial?: Partial<TriviaQueuedQuestion>,
): TriviaQueuedQuestion {
  return {
    id: partial?.id || Math.random().toString(36).slice(2, 10),
    question: partial?.question ?? "",
    optionA: partial?.optionA ?? "True",
    optionB: partial?.optionB ?? "False",
  };
}

export function triviaHistoryEntryFromState(
  t: TriviaGameState,
): TriviaRoundHistory {
  return {
    roundIndex: t.roundIndex,
    roundId: t.roundId,
    question: t.question,
    optionA: t.optionA,
    optionB: t.optionB,
    survivingChoiceId: t.survivingChoiceId,
    choiceACount: t.choiceACount,
    choiceBCount: t.choiceBCount,
    remainingCount: t.remainingCount,
    answeredCount: t.answeredCount,
  };
}

export function withTriviaHistoryAppended(
  t: TriviaGameState,
): TriviaRoundHistory[] {
  const history = Array.isArray(t.history) ? t.history : [];
  if (!t.roundId || t.roundIndex < 1) return history;
  if (history.some((entry) => entry.roundId === t.roundId)) return history;
  return [...history, triviaHistoryEntryFromState(t)];
}
