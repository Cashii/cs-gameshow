import { appendUnique, claimBankId, legacyNamedPayload } from "@/lib/content-bank";

export type PollSavedChoice = {
  text: string;
};

export type PollBankQuestion = {
  id: string;
  question: string;
  choices: PollSavedChoice[];
  correctChoiceIndex: number | null;
};

export type PollChoice = {
  id: string;
  text: string;
  votes: number;
};

const POLL_CHOICE_IDS = ["a", "b", "c", "d", "e", "f"] as const;

/** Next unused a–f id for a poll choice. */
export function nextPollChoiceId(choices: ReadonlyArray<{ id: string }>): string {
  for (const id of POLL_CHOICE_IDS) {
    if (!choices.some((choice) => choice.id === id)) return id;
  }
  return `x${choices.length}`;
}

export type PollVoteLogEntry = {
  id: string;
  at: string;
  choiceId: string;
  choiceText: string;
  voterLabel: string;
  deviceCode: string;
  platform: string;
};

export type PollTimerState = {
  /** When true, a running or paused countdown can appear on the big screen. */
  timerEnabled: boolean;
  timerDurationMs: number;
  timerRemainingMs: number;
  timerRunning: boolean;
  timerEndsAt: number | null;
};

export type PollState = PollTimerState & {
  id: string;
  question: string;
  choices: PollChoice[];
  status: "idle" | "open" | "closed" | "results";
  voteLog: PollVoteLogEntry[];
  /** Operator-selected correct choice, if this poll has one. */
  correctChoiceId: string | null;
  /** When true, spectator/player highlight the correct choice. */
  correctAnswerRevealed: boolean;
  /** When false, hide percentage bars on spectator and player screens. */
  showPercentages: boolean;
  /** Spectator question/answer text size multiplier. */
  scale: number;
  library: PollBankQuestion[];
};

/**
 * Keep operator question/choice edits; pull live vote tallies from remote for
 * matching choice ids. Timer fields stay on the local clock.
 */
export function mergePollLive(remote: PollState, local: PollState): PollState {
  const samePoll = Boolean(local.id) && local.id === remote.id;
  const remoteVotes = new Map(
    remote.choices.map((choice) => [choice.id, choice.votes]),
  );
  const choices =
    samePoll && local.choices.length > 0
      ? local.choices.map((choice) => ({
          ...choice,
          votes: remoteVotes.has(choice.id)
            ? (remoteVotes.get(choice.id) as number)
            : choice.votes,
        }))
      : remote.choices;

  return {
    ...remote,
    question: samePoll ? local.question : remote.question,
    choices,
    correctChoiceId: samePoll ? local.correctChoiceId : remote.correctChoiceId,
    showPercentages: samePoll ? local.showPercentages : remote.showPercentages,
    scale: samePoll ? local.scale : remote.scale,
    library: (local.library?.length ? local.library : remote.library) ?? [],
    timerEnabled: Boolean(local.timerEnabled),
    timerDurationMs: local.timerDurationMs,
    timerRemainingMs: local.timerRemainingMs,
    timerRunning: Boolean(local.timerRunning),
    timerEndsAt: local.timerEndsAt ?? null,
  };
}

export const DEFAULT_POLL_SCALE = 1;
export const MIN_POLL_SCALE = 0.5;
export const MAX_POLL_SCALE = 2.5;
export const POLL_SCALE_STEP = 0.1;

export const POLL_DURATION_PRESETS_MS = [30_000, 45_000, 60_000] as const;
export const DEFAULT_POLL_DURATION_MS = 30_000;
export const MIN_POLL_DURATION_MS = 5_000;
export const MAX_POLL_DURATION_MS = 10 * 60_000;

export function clampPollScale(value: unknown): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : DEFAULT_POLL_SCALE;
  return Math.min(
    MAX_POLL_SCALE,
    Math.max(MIN_POLL_SCALE, Math.round(n * 10) / 10),
  );
}

export function clampPollDurationMs(ms: unknown): number {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return DEFAULT_POLL_DURATION_MS;
  }
  return Math.min(
    MAX_POLL_DURATION_MS,
    Math.max(MIN_POLL_DURATION_MS, Math.round(ms)),
  );
}

export function pollRemainingMs(
  state: Pick<PollState, "timerRunning" | "timerEndsAt" | "timerRemainingMs">,
  now = Date.now(),
): number {
  if (state.timerRunning && state.timerEndsAt != null) {
    return Math.max(0, Math.round(state.timerEndsAt - now));
  }
  return Math.max(0, Math.round(state.timerRemainingMs));
}

export function startPollTimer(
  state: PollState,
  now = Date.now(),
): PollState {
  const remaining = pollRemainingMs(state, now);
  const nextRemaining = remaining > 0 ? remaining : state.timerDurationMs;
  return {
    ...state,
    timerEnabled: true,
    timerRemainingMs: nextRemaining,
    timerRunning: true,
    timerEndsAt: now + nextRemaining,
  };
}

export function pausePollTimer(
  state: PollState,
  now = Date.now(),
): PollState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: pollRemainingMs(state, now),
    timerEndsAt: null,
  };
}

export function resetPollTimer(state: PollState): PollState {
  return {
    ...state,
    timerRunning: false,
    timerRemainingMs: state.timerDurationMs,
    timerEndsAt: null,
  };
}

export function setPollDuration(
  state: PollState,
  durationMs: number,
): PollState {
  const next = clampPollDurationMs(durationMs);
  return {
    ...state,
    timerDurationMs: next,
    timerRemainingMs: next,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function setPollTimerEnabled(
  state: PollState,
  enabled: boolean,
): PollState {
  if (enabled) return { ...state, timerEnabled: true };
  return pausePollTimer({ ...state, timerEnabled: false });
}

/** Audience clock is hidden until the operator starts it, and stays up through a pause or zero. */
export function pollTimerOnScreen(state: PollState): boolean {
  if (!state.timerEnabled) return false;
  if (state.timerRunning) return true;
  return state.timerRemainingMs < state.timerDurationMs;
}

export function formatPollClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPollPreset(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = (ms % 60_000) / 1000;
  return seconds
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${minutes}m`;
}

export function pollTimerFields(
  poll: Partial<PollTimerState> | null | undefined,
): PollTimerState {
  const timerDurationMs = clampPollDurationMs(poll?.timerDurationMs);
  const timerRunning = Boolean(poll?.timerRunning);
  const timerEndsAt =
    timerRunning &&
    typeof poll?.timerEndsAt === "number" &&
    Number.isFinite(poll.timerEndsAt)
      ? poll.timerEndsAt
      : null;
  const timerRemainingMs =
    typeof poll?.timerRemainingMs === "number" &&
    Number.isFinite(poll.timerRemainingMs)
      ? Math.max(0, Math.round(poll.timerRemainingMs))
      : timerDurationMs;
  return {
    timerEnabled: Boolean(poll?.timerEnabled),
    timerDurationMs,
    timerRemainingMs,
    timerRunning: timerRunning && timerEndsAt != null,
    timerEndsAt: timerRunning ? timerEndsAt : null,
  };
}

export type PollHistoryEntry = {
  id: string;
  question: string;
  choices: PollChoice[];
  status: PollState["status"];
  closedAt: string;
  voteLog: PollVoteLogEntry[];
  correctChoiceId: string | null;
  correctAnswerRevealed: boolean;
};

export const MAX_POLL_HISTORY = 20;

export function createDefaultPollState(): PollState {
  return {
    id: "",
    question: "",
    choices: [
      { id: "a", text: "Option A", votes: 0 },
      { id: "b", text: "Option B", votes: 0 },
    ],
    status: "idle",
    voteLog: [],
    correctChoiceId: null,
    correctAnswerRevealed: false,
    showPercentages: true,
    scale: DEFAULT_POLL_SCALE,
    library: [],
    timerEnabled: false,
    timerDurationMs: DEFAULT_POLL_DURATION_MS,
    timerRemainingMs: DEFAULT_POLL_DURATION_MS,
    timerRunning: false,
    timerEndsAt: null,
  };
}

export function pollBankKey(entry: {
  question: string;
  choices: PollSavedChoice[];
  correctChoiceIndex: number | null;
}): string {
  return JSON.stringify({
    question: entry.question.trim(),
    choices: entry.choices.map((choice) => choice.text.trim()),
    correctChoiceIndex: entry.correctChoiceIndex,
  });
}

export function mergePollBank(
  library: PollBankQuestion[],
  incoming: PollBankQuestion[],
): PollBankQuestion[] {
  return appendUnique(library, incoming, pollBankKey);
}

function readPollBankQuestion(
  raw: unknown,
  fallbackQuestion: string,
): Omit<PollBankQuestion, "id"> | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as {
    question?: unknown;
    choices?: unknown;
    correctChoiceIndex?: unknown;
  };
  const choices = Array.isArray(record.choices)
    ? record.choices
        .filter((choice) => choice && typeof choice === "object")
        .map((choice) => ({
          text:
            typeof (choice as { text?: unknown }).text === "string"
              ? (choice as { text: string }).text
              : "",
        }))
        .filter((choice) => choice.text.trim())
        .slice(0, 8)
    : [];
  if (choices.length < 2) return null;
  const correctChoiceIndex =
    typeof record.correctChoiceIndex === "number" &&
    Number.isInteger(record.correctChoiceIndex) &&
    record.correctChoiceIndex >= 0 &&
    record.correctChoiceIndex < choices.length
      ? record.correctChoiceIndex
      : null;
  const question =
    typeof record.question === "string" && record.question.trim()
      ? record.question
      : fallbackQuestion;
  return { question, choices, correctChoiceIndex };
}

export function normalizePollLibrary(raw: unknown): PollBankQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: PollBankQuestion[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const legacy = legacyNamedPayload(item);
    const saved = readPollBankQuestion(
      legacy ? legacy.payload : item,
      legacy?.name ?? "",
    );
    if (!saved) return;
    const id =
      !legacy &&
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : legacy?.id ?? "";
    questions.push({
      id: claimBankId(id, seen, `poll-${index}`),
      ...saved,
    });
  });
  return questions;
}

export function createEmptyPoll(): PollState {
  return createDefaultPollState();
}

export function shouldArchivePoll(poll: PollState): boolean {
  if (!poll.id) return false;
  if (
    poll.status === "open" ||
    poll.status === "closed" ||
    poll.status === "results"
  ) {
    return true;
  }
  if ((poll.voteLog?.length ?? 0) > 0) return true;
  return poll.choices.some((choice) => choice.votes > 0);
}

export function createPollHistoryEntry(
  poll: PollState,
  closedAt = new Date().toISOString(),
): PollHistoryEntry {
  return {
    id: poll.id,
    question: poll.question,
    choices: poll.choices.map((choice) => ({ ...choice })),
    status: poll.status,
    closedAt,
    voteLog: (poll.voteLog ?? []).slice(0, 250),
    correctChoiceId: poll.correctChoiceId ?? null,
    correctAnswerRevealed: Boolean(poll.correctAnswerRevealed),
  };
}

export function withArchivedPoll(
  history: PollHistoryEntry[] | undefined,
  poll: PollState,
): PollHistoryEntry[] {
  if (!shouldArchivePoll(poll)) return history ?? [];
  const entry = createPollHistoryEntry(poll);
  const prior = (history ?? []).filter((item) => item.id !== entry.id);
  return [entry, ...prior].slice(0, MAX_POLL_HISTORY);
}
