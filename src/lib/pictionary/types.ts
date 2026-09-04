import {
  DEFAULT_QUESTION_TIME_DURATION_MS,
  QUESTION_TIME_DURATION_PRESETS_MS,
  clampQuestionTimeDurationMs,
  formatQuestionTimeClock,
  formatQuestionTimePreset,
} from "@/lib/question-time/types";

type LegacyPictionaryReveal = "covered" | "word" | "hint";

export type PictionaryState = {
  word: string;
  /** Character indexes hidden when the hint is showing. */
  hiddenIndexes: number[];
  /** When true, curtains are closed over the board. */
  curtainCovered: boolean;
  /** When true, open curtains show the letter hint instead of the full word. */
  hintEnabled: boolean;
  timerDurationMs: number;
  timerRemainingMs: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
};

export const PICTIONARY_DURATION_PRESETS_MS = QUESTION_TIME_DURATION_PRESETS_MS;
export const DEFAULT_PICTIONARY_DURATION_MS = DEFAULT_QUESTION_TIME_DURATION_MS;

const REVEALS = new Set<string>(["covered", "word", "hint"]);

export function createDefaultPictionaryState(): PictionaryState {
  return {
    word: "",
    hiddenIndexes: [],
    curtainCovered: true,
    hintEnabled: false,
    timerDurationMs: DEFAULT_PICTIONARY_DURATION_MS,
    timerRemainingMs: DEFAULT_PICTIONARY_DURATION_MS,
    timerRunning: false,
    timerEndsAt: null,
  };
}

function isLegacyPictionaryReveal(
  value: unknown,
): value is LegacyPictionaryReveal {
  return typeof value === "string" && REVEALS.has(value);
}

function flagsFromLegacyReveal(reveal: LegacyPictionaryReveal): {
  curtainCovered: boolean;
  hintEnabled: boolean;
} {
  if (reveal === "covered") return { curtainCovered: true, hintEnabled: false };
  if (reveal === "hint") return { curtainCovered: false, hintEnabled: true };
  return { curtainCovered: false, hintEnabled: false };
}

export function hideablePictionaryIndexes(word: string): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== " ") indexes.push(i);
  }
  return indexes;
}

export function sanitizePictionaryHiddenIndexes(
  word: string,
  indexes: unknown,
): number[] {
  const hideable = new Set(hideablePictionaryIndexes(word));
  if (!Array.isArray(indexes)) return [];
  const next: number[] = [];
  const seen = new Set<number>();
  for (const value of indexes) {
    if (typeof value !== "number" || !Number.isInteger(value)) continue;
    if (!hideable.has(value) || seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  return next;
}

export function togglePictionaryHiddenIndex(
  indexes: number[],
  index: number,
): number[] {
  return indexes.includes(index)
    ? indexes.filter((item) => item !== index)
    : [...indexes, index];
}

export function pictionaryRemainingMs(
  state: Pick<
    PictionaryState,
    "timerRunning" | "timerEndsAt" | "timerRemainingMs"
  >,
  now = Date.now(),
): number {
  if (state.timerRunning && state.timerEndsAt != null) {
    return Math.max(0, Math.round(state.timerEndsAt - now));
  }
  return Math.max(0, Math.round(state.timerRemainingMs));
}

export function startPictionaryTimer(
  state: PictionaryState,
  now = Date.now(),
): PictionaryState {
  const remaining = pictionaryRemainingMs(state, now);
  const nextRemaining = remaining > 0 ? remaining : state.timerDurationMs;
  return {
    ...state,
    timerRemainingMs: nextRemaining,
    timerRunning: true,
    timerEndsAt: now + nextRemaining,
  };
}

export function pausePictionaryTimer(
  state: PictionaryState,
  now = Date.now(),
): PictionaryState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: pictionaryRemainingMs(state, now),
    timerEndsAt: null,
  };
}

export function resetPictionaryTimer(state: PictionaryState): PictionaryState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: state.timerDurationMs,
    timerEndsAt: null,
  };
}

export function setPictionaryDuration(
  state: PictionaryState,
  durationMs: number,
): PictionaryState {
  const next = clampQuestionTimeDurationMs(durationMs);
  return {
    ...state,
    timerDurationMs: next,
    timerRemainingMs: next,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function formatPictionaryClock(ms: number): string {
  return formatQuestionTimeClock(ms);
}

export function formatPictionaryPreset(ms: number): string {
  return formatQuestionTimePreset(ms);
}

export function normalizePictionaryState(
  raw: Partial<PictionaryState> & { reveal?: unknown } | undefined,
): PictionaryState {
  const defaults = createDefaultPictionaryState();
  if (!raw || typeof raw !== "object") return defaults;
  const word = typeof raw.word === "string" ? raw.word : defaults.word;
  const timerDurationMs = clampQuestionTimeDurationMs(raw.timerDurationMs);
  const timerRunning = Boolean(raw.timerRunning);
  const timerEndsAt =
    timerRunning &&
    typeof raw.timerEndsAt === "number" &&
    Number.isFinite(raw.timerEndsAt)
      ? raw.timerEndsAt
      : null;
  const timerRemainingMs =
    typeof raw.timerRemainingMs === "number" &&
    Number.isFinite(raw.timerRemainingMs)
      ? Math.max(0, Math.round(raw.timerRemainingMs))
      : timerDurationMs;

  let curtainCovered = defaults.curtainCovered;
  let hintEnabled = defaults.hintEnabled;
  if (typeof raw.curtainCovered === "boolean" || typeof raw.hintEnabled === "boolean") {
    curtainCovered =
      typeof raw.curtainCovered === "boolean"
        ? raw.curtainCovered
        : defaults.curtainCovered;
    hintEnabled =
      typeof raw.hintEnabled === "boolean" ? raw.hintEnabled : defaults.hintEnabled;
  } else if (isLegacyPictionaryReveal(raw.reveal)) {
    ({ curtainCovered, hintEnabled } = flagsFromLegacyReveal(raw.reveal));
  }

  return {
    word,
    hiddenIndexes: sanitizePictionaryHiddenIndexes(word, raw.hiddenIndexes),
    curtainCovered,
    hintEnabled,
    timerDurationMs,
    timerRemainingMs,
    timerRunning: timerRunning && timerEndsAt != null,
    timerEndsAt: timerRunning ? timerEndsAt : null,
  };
}
