import { appendUnique, claimBankId, legacyNamedPayload } from "@/lib/content-bank";

export type TriviaStatus =
  | "idle"
  | "open"
  | "locked"
  | "revealed"
  | "finished";

export const TRIVIA_CHOICE_IDS = ["a", "b", "c", "d", "e"] as const;
export type TriviaChoiceId = (typeof TRIVIA_CHOICE_IDS)[number];

export const MIN_TRIVIA_OPTIONS = 2;
export const MAX_TRIVIA_OPTIONS = 5;
export const DEFAULT_TRIVIA_OPTIONS = ["True", "False"];

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
  options: string[];
  optionA: string;
  optionB: string;
};

export type TriviaRoundHistory = {
  roundIndex: number;
  roundId: string;
  question: string;
  options: string[];
  optionA: string;
  optionB: string;
  survivingChoiceId: TriviaChoiceId | null;
  choiceCounts: number[];
  choiceACount: number;
  choiceBCount: number;
  remainingCount: number;
  answeredCount: number;
};

export type TriviaTimerState = {
  /** When true, a running or paused countdown can appear on the big screen. */
  timerEnabled: boolean;
  timerDurationMs: number;
  timerRemainingMs: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
};

export type TriviaGameState = TriviaTimerState & {
  status: TriviaStatus;
  roundId: string;
  roundIndex: number;
  question: string;
  options: string[];
  optionA: string;
  optionB: string;
  survivingChoiceId: TriviaChoiceId | null;
  answeredCount: number;
  choiceCounts: number[];
  choiceACount: number;
  choiceBCount: number;
  remainingCount: number;
  fieldSize: number;
  winnerCodes: string[];
  queue: TriviaQueuedQuestion[];
  history: TriviaRoundHistory[];
  library: TriviaBankQuestion[];
};

export const TRIVIA_DURATION_PRESETS_MS = [30_000, 45_000, 60_000] as const;
export const DEFAULT_TRIVIA_DURATION_MS = 30_000;
export const MIN_TRIVIA_DURATION_MS = 5_000;
export const MAX_TRIVIA_DURATION_MS = 10 * 60_000;

export function clampTriviaDurationMs(ms: unknown): number {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return DEFAULT_TRIVIA_DURATION_MS;
  }
  return Math.min(
    MAX_TRIVIA_DURATION_MS,
    Math.max(MIN_TRIVIA_DURATION_MS, Math.round(ms)),
  );
}

export function triviaRemainingMs(
  state: Pick<
    TriviaGameState,
    "timerRunning" | "timerEndsAt" | "timerRemainingMs"
  >,
  now = Date.now(),
): number {
  if (state.timerRunning && state.timerEndsAt != null) {
    return Math.max(0, Math.round(state.timerEndsAt - now));
  }
  return Math.max(0, Math.round(state.timerRemainingMs));
}

export function startTriviaTimer(
  state: TriviaGameState,
  now = Date.now(),
): TriviaGameState {
  const remaining = triviaRemainingMs(state, now);
  const nextRemaining = remaining > 0 ? remaining : state.timerDurationMs;
  return {
    ...state,
    timerEnabled: true,
    timerRemainingMs: nextRemaining,
    timerRunning: true,
    timerEndsAt: now + nextRemaining,
  };
}

export function pauseTriviaTimer(
  state: TriviaGameState,
  now = Date.now(),
): TriviaGameState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: triviaRemainingMs(state, now),
    timerEndsAt: null,
  };
}

export function resetTriviaTimer(state: TriviaGameState): TriviaGameState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: state.timerDurationMs,
    timerEndsAt: null,
  };
}

export function setTriviaDuration(
  state: TriviaGameState,
  durationMs: number,
): TriviaGameState {
  const next = clampTriviaDurationMs(durationMs);
  return {
    ...state,
    timerDurationMs: next,
    timerRemainingMs: next,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function setTriviaTimerEnabled(
  state: TriviaGameState,
  enabled: boolean,
): TriviaGameState {
  if (enabled) return { ...state, timerEnabled: true };
  return pauseTriviaTimer({ ...state, timerEnabled: false });
}

/** Audience clock is hidden until the operator starts it, and stays up through a pause or zero. */
export function triviaTimerOnScreen(state: TriviaGameState): boolean {
  if (!state.timerEnabled) return false;
  if (state.timerRunning) return true;
  return state.timerRemainingMs < state.timerDurationMs;
}

export function formatTriviaClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTriviaPreset(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = (ms % 60_000) / 1000;
  return seconds
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${minutes}m`;
}

export function triviaTimerFields(
  trivia: Partial<TriviaTimerState> | null | undefined,
): TriviaTimerState {
  const timerDurationMs = clampTriviaDurationMs(trivia?.timerDurationMs);
  const timerRunning = Boolean(trivia?.timerRunning);
  const timerEndsAt =
    timerRunning &&
    typeof trivia?.timerEndsAt === "number" &&
    Number.isFinite(trivia.timerEndsAt)
      ? trivia.timerEndsAt
      : null;
  const timerRemainingMs =
    typeof trivia?.timerRemainingMs === "number" &&
    Number.isFinite(trivia.timerRemainingMs)
      ? Math.max(0, Math.round(trivia.timerRemainingMs))
      : timerDurationMs;
  return {
    timerEnabled: Boolean(trivia?.timerEnabled),
    timerDurationMs,
    timerRemainingMs,
    timerRunning: timerRunning && timerEndsAt != null,
    timerEndsAt: timerRunning ? timerEndsAt : null,
  };
}

export type TriviaBankQuestion = {
  id: string;
  question: string;
  options: string[];
  optionA: string;
  optionB: string;
};

export function isTriviaChoiceId(value: unknown): value is TriviaChoiceId {
  return (
    typeof value === "string" &&
    (TRIVIA_CHOICE_IDS as readonly string[]).includes(value)
  );
}

export function triviaChoiceIndex(id: TriviaChoiceId): number {
  return TRIVIA_CHOICE_IDS.indexOf(id);
}

export function triviaChoiceIdAt(index: number): TriviaChoiceId | null {
  return TRIVIA_CHOICE_IDS[index] ?? null;
}

export function triviaChoiceLetter(id: TriviaChoiceId): string {
  return id.toUpperCase();
}

export function normalizeTriviaOptions(
  raw: unknown,
  fallbackA?: string,
  fallbackB?: string,
): string[] {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim());
  }
  if (list.length < MIN_TRIVIA_OPTIONS) {
    const a =
      typeof fallbackA === "string" && fallbackA.trim()
        ? fallbackA.trim()
        : DEFAULT_TRIVIA_OPTIONS[0];
    const b =
      typeof fallbackB === "string" && fallbackB.trim()
        ? fallbackB.trim()
        : DEFAULT_TRIVIA_OPTIONS[1];
    if (list.length === 1) list = [list[0] || a, b];
    else list = [a, b];
  }
  return list.slice(0, MAX_TRIVIA_OPTIONS);
}

export function emptyTriviaChoiceCounts(count: number): number[] {
  const n = Math.min(
    MAX_TRIVIA_OPTIONS,
    Math.max(MIN_TRIVIA_OPTIONS, Math.floor(count) || MIN_TRIVIA_OPTIONS),
  );
  return Array.from({ length: n }, () => 0);
}

export function normalizeTriviaChoiceCounts(
  raw: unknown,
  optionCount: number,
  fallbackA?: number,
  fallbackB?: number,
): number[] {
  const n = Math.min(
    MAX_TRIVIA_OPTIONS,
    Math.max(MIN_TRIVIA_OPTIONS, optionCount),
  );
  const fromArray = Array.isArray(raw)
    ? raw.map((value) =>
        typeof value === "number" && Number.isFinite(value)
          ? Math.max(0, Math.floor(value))
          : 0,
      )
    : [];
  const counts = emptyTriviaChoiceCounts(n);
  for (let i = 0; i < n; i += 1) {
    counts[i] = fromArray[i] ?? 0;
  }
  if (!Array.isArray(raw) || fromArray.length === 0) {
    if (typeof fallbackA === "number" && Number.isFinite(fallbackA)) {
      counts[0] = Math.max(0, Math.floor(fallbackA));
    }
    if (typeof fallbackB === "number" && Number.isFinite(fallbackB)) {
      counts[1] = Math.max(0, Math.floor(fallbackB));
    }
  }
  return counts;
}

export function syncTriviaOptionsFields<
  T extends {
    options?: string[];
    optionA?: string;
    optionB?: string;
    choiceCounts?: number[];
    choiceACount?: number;
    choiceBCount?: number;
  },
>(value: T): T & {
  options: string[];
  optionA: string;
  optionB: string;
  choiceCounts: number[];
  choiceACount: number;
  choiceBCount: number;
} {
  const options = normalizeTriviaOptions(
    value.options,
    value.optionA,
    value.optionB,
  );
  const choiceCounts = normalizeTriviaChoiceCounts(
    value.choiceCounts,
    options.length,
    value.choiceACount,
    value.choiceBCount,
  );
  return {
    ...value,
    options,
    optionA: options[0] ?? DEFAULT_TRIVIA_OPTIONS[0],
    optionB: options[1] ?? DEFAULT_TRIVIA_OPTIONS[1],
    choiceCounts,
    choiceACount: choiceCounts[0] ?? 0,
    choiceBCount: choiceCounts[1] ?? 0,
  };
}

export function optionTextForChoice(
  options: string[],
  id: TriviaChoiceId | null,
): string {
  if (!id) return "";
  const index = triviaChoiceIndex(id);
  return options[index] ?? "";
}

export function isTriviaChoiceOpen(
  options: string[],
  choiceId: string,
): choiceId is TriviaChoiceId {
  if (!isTriviaChoiceId(choiceId)) return false;
  return triviaChoiceIndex(choiceId) < options.length;
}

export function createDefaultTriviaState(): TriviaGameState {
  const options = [...DEFAULT_TRIVIA_OPTIONS];
  const choiceCounts = emptyTriviaChoiceCounts(options.length);
  return {
    status: "idle",
    roundId: "",
    roundIndex: 0,
    question: "",
    options,
    optionA: options[0],
    optionB: options[1],
    survivingChoiceId: null,
    answeredCount: 0,
    choiceCounts,
    choiceACount: 0,
    choiceBCount: 0,
    remainingCount: 0,
    fieldSize: 0,
    winnerCodes: [],
    queue: [],
    history: [],
    library: [],
    timerEnabled: false,
    timerDurationMs: DEFAULT_TRIVIA_DURATION_MS,
    timerRemainingMs: DEFAULT_TRIVIA_DURATION_MS,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function triviaBankKey(entry: {
  question: string;
  options: string[];
}): string {
  return JSON.stringify({
    question: entry.question.trim(),
    options: entry.options.map((option) => option.trim()),
  });
}

export function mergeTriviaBank(
  library: TriviaBankQuestion[],
  incoming: TriviaBankQuestion[],
): TriviaBankQuestion[] {
  return appendUnique(library, incoming, triviaBankKey);
}

function readTriviaBankQuestion(
  raw: unknown,
): Omit<TriviaBankQuestion, "id"> | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<TriviaQueuedQuestion>;
  const question = typeof record.question === "string" ? record.question : "";
  if (!question.trim()) return null;
  const options = normalizeTriviaOptions(
    record.options,
    record.optionA,
    record.optionB,
  );
  return {
    question,
    options,
    optionA: options[0] ?? "",
    optionB: options[1] ?? "",
  };
}

export function normalizeTriviaLibrary(raw: unknown): TriviaBankQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: TriviaBankQuestion[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const legacy = legacyNamedPayload(item);
    if (legacy && Array.isArray(legacy.payload)) {
      legacy.payload.forEach((question, questionIndex) => {
        const saved = readTriviaBankQuestion(question);
        if (!saved) return;
        const nestedId =
          question &&
          typeof question === "object" &&
          typeof (question as { id?: unknown }).id === "string"
            ? (question as { id: string }).id
            : "";
        questions.push({
          id: claimBankId(
            nestedId || (legacy.id ? `${legacy.id}-${questionIndex}` : ""),
            seen,
            `trivia-${index}-${questionIndex}`,
          ),
          ...saved,
        });
      });
      return;
    }
    const saved = readTriviaBankQuestion(item);
    if (!saved) return;
    const id =
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : "";
    questions.push({
      id: claimBankId(id, seen, `trivia-${index}`),
      ...saved,
    });
  });
  return questions;
}

export function createTriviaQueuedQuestion(
  partial?: Partial<TriviaQueuedQuestion>,
): TriviaQueuedQuestion {
  const synced = syncTriviaOptionsFields({
    options: partial?.options,
    optionA: partial?.optionA,
    optionB: partial?.optionB,
  });
  return {
    id: partial?.id || Math.random().toString(36).slice(2, 10),
    question: partial?.question ?? "",
    options: synced.options,
    optionA: synced.optionA,
    optionB: synced.optionB,
  };
}

export function triviaHistoryEntryFromState(
  t: TriviaGameState,
): TriviaRoundHistory {
  const synced = syncTriviaOptionsFields(t);
  return {
    roundIndex: t.roundIndex,
    roundId: t.roundId,
    question: t.question,
    options: synced.options,
    optionA: synced.optionA,
    optionB: synced.optionB,
    survivingChoiceId: t.survivingChoiceId,
    choiceCounts: synced.choiceCounts,
    choiceACount: synced.choiceACount,
    choiceBCount: synced.choiceBCount,
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
