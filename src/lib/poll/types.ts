export type PollChoice = {
  id: string;
  text: string;
  votes: number;
};

export type PollVoteLogEntry = {
  id: string;
  at: string;
  choiceId: string;
  choiceText: string;
  voterLabel: string;
  deviceCode: string;
  platform: string;
};

export type PollState = {
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
};

export const DEFAULT_POLL_SCALE = 1;
export const MIN_POLL_SCALE = 0.5;
export const MAX_POLL_SCALE = 2.5;
export const POLL_SCALE_STEP = 0.1;

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
  };
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
