import {
  appendUnique,
  claimBankId,
  groupIdOf,
  legacyNamedPayload,
  type ContentGroup,
} from "@/lib/content-bank";
import { uid } from "@/lib/utils";

export type QuestionTimeBankEntry = {
  id: string;
  title: string;
  question: string;
  /** Null means this question is ungrouped. */
  groupId: string | null;
};

export type QuestionTimeTeam = {
  id: string;
  name: string;
  score: number;
};

export type QuestionTimeState = {
  /** Audience header title. */
  title: string;
  question: string;
  teams: QuestionTimeTeam[];
  /** Configured length of the clock. */
  timerDurationMs: number;
  /** Remaining time when paused or idle. */
  timerRemainingMs: number;
  timerRunning: boolean;
  /** Epoch ms when a running clock hits zero. */
  timerEndsAt: number | null;
  groups: ContentGroup[];
  library: QuestionTimeBankEntry[];
};

export const DEFAULT_QUESTION_TIME_TITLE = "Newly Weds";
export const MIN_QUESTION_TIME_TEAMS = 2;
export const MAX_QUESTION_TIME_TEAMS = 8;

export const QUESTION_TIME_DURATION_PRESETS_MS = [
  10_000, 15_000, 20_000, 30_000, 45_000, 60_000, 90_000, 120_000,
] as const;

export const DEFAULT_QUESTION_TIME_DURATION_MS = 30_000;
export const MIN_QUESTION_TIME_DURATION_MS = 5_000;
export const MAX_QUESTION_TIME_DURATION_MS = 10 * 60_000;

export function createQuestionTimeTeam(
  name: string,
  score = 0,
): QuestionTimeTeam {
  return { id: uid(), name, score };
}

export function createDefaultQuestionTimeState(): QuestionTimeState {
  return {
    title: DEFAULT_QUESTION_TIME_TITLE,
    question: "",
    teams: [
      createQuestionTimeTeam("Team 1"),
      createQuestionTimeTeam("Team 2"),
    ],
    timerDurationMs: DEFAULT_QUESTION_TIME_DURATION_MS,
    timerRemainingMs: DEFAULT_QUESTION_TIME_DURATION_MS,
    timerRunning: false,
    timerEndsAt: null,
    groups: [],
    library: [],
  };
}

export function questionTimeBankKey(entry: {
  title: string;
  question: string;
}): string {
  return JSON.stringify({
    title: entry.title.trim(),
    question: entry.question.trim(),
  });
}

export function mergeQuestionTimeBank(
  library: QuestionTimeBankEntry[],
  incoming: QuestionTimeBankEntry[],
): QuestionTimeBankEntry[] {
  return appendUnique(library, incoming, questionTimeBankKey);
}

function readQuestionTimePrompt(
  raw: unknown,
  fallbackQuestion: string,
): { title: string; question: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { title?: unknown; question?: unknown };
  const title = typeof record.title === "string" ? record.title : "";
  const question =
    typeof record.question === "string" && record.question.trim()
      ? record.question
      : fallbackQuestion;
  if (!title.trim() && !question.trim()) return null;
  return { title, question };
}

export function normalizeQuestionTimeLibrary(
  raw: unknown,
  groups: readonly ContentGroup[] = [],
): QuestionTimeBankEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: QuestionTimeBankEntry[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const legacy = legacyNamedPayload(item);
    const source = legacy ? legacy.payload : item;
    const prompt = readQuestionTimePrompt(source, legacy?.name ?? "");
    if (!prompt) return;
    const id =
      !legacy &&
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : legacy?.id ?? "";
    entries.push({
      id: claimBankId(id, seen, `question-${index}`),
      groupId: groupIdOf(legacy ? source : item, groups),
      ...prompt,
    });
  });
  return entries;
}

export function clampQuestionTimeDurationMs(ms: unknown): number {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return DEFAULT_QUESTION_TIME_DURATION_MS;
  }
  return Math.min(
    MAX_QUESTION_TIME_DURATION_MS,
    Math.max(MIN_QUESTION_TIME_DURATION_MS, Math.round(ms)),
  );
}

export function clampQuestionTimeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9999, Math.round(value)));
}

export function questionTimeRemainingMs(
  state: Pick<
    QuestionTimeState,
    "timerRunning" | "timerEndsAt" | "timerRemainingMs"
  >,
  now = Date.now(),
): number {
  if (state.timerRunning && state.timerEndsAt != null) {
    return Math.max(0, Math.round(state.timerEndsAt - now));
  }
  return Math.max(0, Math.round(state.timerRemainingMs));
}

export function startQuestionTimeTimer(
  state: QuestionTimeState,
  now = Date.now(),
): QuestionTimeState {
  const remaining = questionTimeRemainingMs(state, now);
  const nextRemaining = remaining > 0 ? remaining : state.timerDurationMs;
  return {
    ...state,
    timerRemainingMs: nextRemaining,
    timerRunning: true,
    timerEndsAt: now + nextRemaining,
  };
}

export function pauseQuestionTimeTimer(
  state: QuestionTimeState,
  now = Date.now(),
): QuestionTimeState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: questionTimeRemainingMs(state, now),
    timerEndsAt: null,
  };
}

export function resetQuestionTimeTimer(
  state: QuestionTimeState,
): QuestionTimeState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: state.timerDurationMs,
    timerEndsAt: null,
  };
}

export function setQuestionTimeDuration(
  state: QuestionTimeState,
  durationMs: number,
): QuestionTimeState {
  const next = clampQuestionTimeDurationMs(durationMs);
  return {
    ...state,
    timerDurationMs: next,
    timerRemainingMs: next,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function formatQuestionTimeClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatQuestionTimePreset(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = (ms % 60_000) / 1000;
  return seconds ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${minutes}m`;
}
