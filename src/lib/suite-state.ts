import { createSampleFeudGame } from "@/lib/feud/defaults";
import type { FeudGameState } from "@/lib/feud/types";
import { createDefaultWheelState, type WheelGameState } from "@/lib/wheel/types";
import {
  createDefaultLiveDrawerState,
  clampLiveDrawerNumberScale,
  DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
  type LiveDrawerGameState,
  type LiveDrawerToken,
  type PoolSummary,
} from "@/lib/live-drawer/types";
import {
  MIN_TAKE_IT_CASES,
  MAX_TAKE_IT_CASES,
  createDefaultTakeItState,
  emptyTakeItPickCounts,
  isTakeItCard,
  type TakeItCard,
  type TakeItGameState,
  type TakeItPhase,
} from "@/lib/take-it-or-leave-it/types";
import {
  createEmptyPoll,
  MAX_POLL_HISTORY,
  type PollHistoryEntry,
  type PollState,
} from "@/lib/poll/types";
import {
  clampMessageBoardScale,
  createDefaultMessageBoardState,
  type MessageBoardState,
} from "@/lib/message-board/types";
import {
  clampDerbyRacerScale,
  emptyDerbyVoteTallies,
  createDefaultDerbyState,
  DERBY_RACER_IDS,
  DERBY_THEMES,
  isDerbyRacerId,
  isDerbyTheme,
  type DerbyGameState,
  type DerbyPhase,
  type DerbyRacerId,
} from "@/lib/derby/types";
import { createSampleJeoparodyGame } from "@/lib/jeoparody/defaults";
import type { JeoparodyGameState, JeoparodyPhase } from "@/lib/jeoparody/types";
import {
  createDefaultTriviaState,
  isTriviaChoiceId,
  type TriviaGameState,
  type TriviaQueuedQuestion,
  type TriviaRoundHistory,
  type TriviaStatus,
} from "@/lib/trivia/types";
import {
  createDefaultPriceGuesserState,
  parsePriceGuesserResult,
  withSyncedPriceGuesserResult,
  type PriceGuesserState,
} from "@/lib/price-guesser/types";
import {
  createDefaultPriceOrderState,
  PRICE_ORDER_MAX_ITEMS,
  syncPriceOrderSlots,
  withSyncedPriceOrderResult,
  type PriceOrderItem,
  type PriceOrderState,
} from "@/lib/price-order/types";
import { normalizePhotoFit } from "@/lib/price/photo-fit";
import {
  MIN_QUESTION_TIME_TEAMS,
  MAX_QUESTION_TIME_TEAMS,
  clampQuestionTimeDurationMs,
  clampQuestionTimeScore,
  createDefaultQuestionTimeState,
  createQuestionTimeTeam,
  type QuestionTimeState,
  type QuestionTimeTeam,
} from "@/lib/question-time/types";
import {
  createDefaultPictionaryState,
  normalizePictionaryState,
  type PictionaryState,
} from "@/lib/pictionary/types";

export type ActiveGame =
  | "feud"
  | "wheel"
  | "liveDrawer"
  | "takeIt"
  | "idle"
  | "poll"
  | "messageBoard"
  | "derby"
  | "jeoparody"
  | "trivia"
  | "priceGuesser"
  | "priceOrder"
  | "questionTime"
  | "pictionary";
export type SpectatorScreen = ActiveGame;

export type SuiteState = {
  /** Game the operator is currently editing / controlling. */
  activeGame: ActiveGame;
  /** Screen shown on the spectator display (independent of activeGame). */
  spectatorGame: SpectatorScreen;
  spectatorCovered: boolean;
  feud: FeudGameState;
  wheel: WheelGameState;
  liveDrawer: LiveDrawerGameState;
  takeIt: TakeItGameState;
  poll: PollState;
  pollHistory: PollHistoryEntry[];
  messageBoard: MessageBoardState;
  derby: DerbyGameState;
  jeoparody: JeoparodyGameState;
  trivia: TriviaGameState;
  priceGuesser: PriceGuesserState;
  priceOrder: PriceOrderState;
  questionTime: QuestionTimeState;
  pictionary: PictionaryState;
};

export type EventSnapshot = SuiteState & {
  revision: number;
  poolSummary: PoolSummary;
  poolTokens: LiveDrawerToken[];
  calledTokens: LiveDrawerToken[];
};

type LegacySuiteState = Partial<Omit<SuiteState, "activeGame" | "liveDrawer">> & {
  activeGame?: ActiveGame | "deal" | "draw";
  spectatorGame?: SpectatorScreen | "deal" | "draw";
  audienceCovered?: boolean;
  draw?: LegacyLiveDrawer & { colors?: unknown };
  liveDrawer?: LegacyLiveDrawer & { colors?: unknown };
  deal?: TakeItGameState & { dealAccepted?: boolean | null };
};

function normalizeActiveGame(
  raw: ActiveGame | "deal" | "draw" | undefined,
  fallback: ActiveGame,
): ActiveGame {
  if (raw === "deal") return "takeIt";
  if (raw === "draw") return "liveDrawer";
  if (
    raw === "idle" ||
    raw === "feud" ||
    raw === "wheel" ||
    raw === "liveDrawer" ||
    raw === "takeIt" ||
    raw === "poll" ||
    raw === "messageBoard" ||
    raw === "derby" ||
    raw === "jeoparody" ||
    raw === "trivia" ||
    raw === "priceGuesser" ||
    raw === "priceOrder" ||
    raw === "questionTime" ||
    raw === "pictionary"
  ) {
    return raw;
  }
  return fallback;
}

function normalizeSpectatorScreen(
  raw: SpectatorScreen | "deal" | "draw" | undefined,
  fallback: SpectatorScreen,
): SpectatorScreen {
  return normalizeActiveGame(raw, fallback);
}

type LegacyLiveDrawer = Partial<LiveDrawerGameState> & {
  number?: string | null;
  colorId?: string | null;
  colors?: unknown;
};

export const SUITE_STORAGE_KEY = "cs_gameshow_suite_v1";
export const SUITE_SYNC_CHANNEL = "cs_gameshow_sync";
export const SUITE_FALLBACK_KEY = "cs_gameshow_last_state";

export const EVENT_ID = "default";

export function createDefaultSuiteState(): SuiteState {
  return {
    activeGame: "idle",
    spectatorGame: "idle",
    spectatorCovered: false,
    feud: createSampleFeudGame(),
    wheel: createDefaultWheelState(),
    liveDrawer: createDefaultLiveDrawerState(),
    takeIt: createDefaultTakeItState(),
    poll: createEmptyPoll(),
    pollHistory: [],
    messageBoard: createDefaultMessageBoardState(),
    derby: createDefaultDerbyState(),
    jeoparody: createSampleJeoparodyGame(),
    trivia: createDefaultTriviaState(),
    priceGuesser: createDefaultPriceGuesserState(),
    priceOrder: createDefaultPriceOrderState(),
    questionTime: createDefaultQuestionTimeState(),
    pictionary: createDefaultPictionaryState(),
  };
}

const TAKE_IT_PHASES = new Set<TakeItPhase>(["setup", "pick", "playing"]);

function normalizeTakeItState(
  raw: LegacySuiteState["takeIt"] | LegacySuiteState["deal"] | undefined,
): TakeItGameState {
  const defaults = createDefaultTakeItState();
  if (!raw || typeof raw !== "object") return defaults;

  let cards: TakeItCard[] = [];
  const rawAny = raw as {
    cards?: unknown;
    values?: unknown;
    phase?: unknown;
    roundId?: unknown;
    pickCounts?: unknown;
    cases?: unknown;
    lastOpenedCaseId?: unknown;
  };
  if (Array.isArray(rawAny.cards)) {
    cards = rawAny.cards
      .map((card) => (isTakeItCard(card) ? card : null))
      .filter((card): card is TakeItCard => card != null)
      .slice(0, MAX_TAKE_IT_CASES);
  } else if (Array.isArray(rawAny.values)) {
    // Legacy money values → alternate green/red by index.
    const values = rawAny.values.slice(0, MAX_TAKE_IT_CASES);
    cards = values.map((_, index) => (index % 2 === 0 ? "green" : "red"));
  }
  if (cards.length < MIN_TAKE_IT_CASES) {
    cards = [...defaults.cards];
  }

  const phaseRaw =
    typeof rawAny.phase === "string" ? rawAny.phase : defaults.phase;
  let phase: TakeItPhase = defaults.phase;
  if (TAKE_IT_PHASES.has(phaseRaw as TakeItPhase)) {
    phase = phaseRaw as TakeItPhase;
  } else if (
    phaseRaw === "offer" ||
    phaseRaw === "final" ||
    phaseRaw === "revealed"
  ) {
    phase = "playing";
  }

  const rawCases = Array.isArray(rawAny.cases) ? rawAny.cases : [];
  const cases = rawCases
    .map((c, index) => {
      if (!c || typeof c !== "object") return null;
      const entry = c as {
        id?: unknown;
        card?: unknown;
        value?: unknown;
        opened?: unknown;
      };
      const id =
        typeof entry.id === "number" && Number.isFinite(entry.id)
          ? entry.id
          : index + 1;
      let card: TakeItCard | null = isTakeItCard(entry.card) ? entry.card : null;
      if (!card && typeof entry.value === "number") {
        card = entry.value % 2 === 0 ? "green" : "red";
      }
      if (!card) return null;
      return {
        id,
        card,
        opened: Boolean(entry.opened),
      };
    })
    .filter(
      (c): c is { id: number; card: TakeItCard; opened: boolean } => c != null,
    );

  const pickCounts = emptyTakeItPickCounts();
  if (rawAny.pickCounts && typeof rawAny.pickCounts === "object") {
    for (const [key, value] of Object.entries(
      rawAny.pickCounts as Record<string, unknown>,
    )) {
      if (typeof value === "number" && Number.isFinite(value)) {
        pickCounts[key] = Math.max(0, Math.floor(value));
      }
    }
  }

  return {
    phase,
    cards,
    cases,
    roundId: typeof rawAny.roundId === "string" ? rawAny.roundId || null : null,
    lastOpenedCaseId:
      typeof rawAny.lastOpenedCaseId === "number"
        ? rawAny.lastOpenedCaseId
        : null,
    pickCounts,
  };
}

function normalizeLiveDrawerState(
  raw: LegacySuiteState["liveDrawer"] | LegacySuiteState["draw"] | undefined,
): LiveDrawerGameState {
  const defaults = createDefaultLiveDrawerState();
  if (!raw) return defaults;

  const { colors: _ignored, number, colorId, ...rest } = raw;

  let revealedTokens = rest.revealedTokens;
  if (!Array.isArray(revealedTokens) && number != null) {
    revealedTokens = [
      {
        id: "legacy",
        number: String(number),
        colorId: colorId ?? "blue",
      },
    ];
  }

  return {
    ...defaults,
    ...rest,
    revealedTokens: Array.isArray(revealedTokens) ? revealedTokens : [],
    numberScale:
      typeof rest.numberScale === "number"
        ? clampLiveDrawerNumberScale(rest.numberScale)
        : DEFAULT_LIVE_DRAWER_NUMBER_SCALE,
    sequence: typeof rest.sequence === "number" ? rest.sequence : 0,
  };
}

function normalizePollState(raw: Partial<PollState> | undefined): PollState {
  const defaults = createEmptyPoll();
  if (!raw || typeof raw !== "object") return defaults;
  return {
    ...defaults,
    ...raw,
    choices: Array.isArray(raw.choices) && raw.choices.length >= 2
      ? raw.choices.map((c, i) => ({
          id: c.id ?? String.fromCharCode(97 + i),
          text: c.text ?? `Option ${i + 1}`,
          votes: typeof c.votes === "number" ? c.votes : 0,
        }))
      : defaults.choices,
    status: raw.status ?? "idle",
    voteLog: Array.isArray(raw.voteLog)
      ? raw.voteLog
          .filter(
            (entry) =>
              !!entry &&
              typeof entry.id === "string" &&
              typeof entry.at === "string" &&
              typeof entry.choiceId === "string" &&
              typeof entry.choiceText === "string" &&
              typeof entry.voterLabel === "string",
          )
          .map((entry) => ({
            id: entry.id,
            at: entry.at,
            choiceId: entry.choiceId,
            choiceText: entry.choiceText,
            voterLabel: entry.voterLabel,
            deviceCode:
              typeof entry.deviceCode === "string" ? entry.deviceCode : "",
            platform: typeof entry.platform === "string" ? entry.platform : "",
          }))
      : [],
  };
}

function normalizePollHistory(
  raw: unknown,
): PollHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): PollHistoryEntry | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Partial<PollHistoryEntry>;
      if (typeof item.id !== "string" || !item.id) return null;
      const poll = normalizePollState({
        id: item.id,
        question: item.question,
        choices: item.choices,
        status: item.status,
        voteLog: item.voteLog,
      });
      return {
        id: poll.id,
        question: poll.question,
        choices: poll.choices,
        status: poll.status,
        closedAt:
          typeof item.closedAt === "string" && item.closedAt
            ? item.closedAt
            : new Date(0).toISOString(),
        voteLog: poll.voteLog,
      };
    })
    .filter((entry): entry is PollHistoryEntry => entry != null)
    .slice(0, MAX_POLL_HISTORY);
}

function normalizeMessageBoardState(
  raw: Partial<MessageBoardState> | undefined,
): MessageBoardState {
  const defaults = createDefaultMessageBoardState();
  if (!raw || typeof raw !== "object") return defaults;
  return {
    text: typeof raw.text === "string" ? raw.text : defaults.text,
    scale: clampMessageBoardScale(raw.scale),
  };
}

const TRIVIA_STATUSES = new Set<TriviaStatus>([
  "idle",
  "open",
  "locked",
  "revealed",
  "finished",
]);

function normalizeTriviaQueuedQuestion(
  raw: Partial<TriviaQueuedQuestion> | undefined,
  index: number,
): TriviaQueuedQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id
        : `queue-${index}`,
    question: typeof raw.question === "string" ? raw.question : "",
    optionA: typeof raw.optionA === "string" ? raw.optionA : "True",
    optionB: typeof raw.optionB === "string" ? raw.optionB : "False",
  };
}

function normalizeTriviaHistoryEntry(
  raw: Partial<TriviaRoundHistory> | undefined,
): TriviaRoundHistory | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.roundId !== "string" || !raw.roundId) return null;
  return {
    roundIndex:
      typeof raw.roundIndex === "number" && Number.isFinite(raw.roundIndex)
        ? Math.max(0, Math.floor(raw.roundIndex))
        : 0,
    roundId: raw.roundId,
    question: typeof raw.question === "string" ? raw.question : "",
    optionA: typeof raw.optionA === "string" ? raw.optionA : "True",
    optionB: typeof raw.optionB === "string" ? raw.optionB : "False",
    survivingChoiceId: isTriviaChoiceId(raw.survivingChoiceId)
      ? raw.survivingChoiceId
      : null,
    choiceACount:
      typeof raw.choiceACount === "number" && Number.isFinite(raw.choiceACount)
        ? Math.max(0, Math.floor(raw.choiceACount))
        : 0,
    choiceBCount:
      typeof raw.choiceBCount === "number" && Number.isFinite(raw.choiceBCount)
        ? Math.max(0, Math.floor(raw.choiceBCount))
        : 0,
    remainingCount:
      typeof raw.remainingCount === "number" &&
      Number.isFinite(raw.remainingCount)
        ? Math.max(0, Math.floor(raw.remainingCount))
        : 0,
    answeredCount:
      typeof raw.answeredCount === "number" &&
      Number.isFinite(raw.answeredCount)
        ? Math.max(0, Math.floor(raw.answeredCount))
        : 0,
  };
}

function normalizeTriviaState(
  raw: Partial<TriviaGameState> | undefined,
): TriviaGameState {
  const defaults = createDefaultTriviaState();
  if (!raw || typeof raw !== "object") return defaults;
  const status = TRIVIA_STATUSES.has(raw.status as TriviaStatus)
    ? (raw.status as TriviaStatus)
    : defaults.status;
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    status,
    roundId: typeof raw.roundId === "string" ? raw.roundId : defaults.roundId,
    roundIndex: Math.max(0, Math.floor(num(raw.roundIndex, defaults.roundIndex))),
    question: typeof raw.question === "string" ? raw.question : defaults.question,
    optionA: typeof raw.optionA === "string" ? raw.optionA : defaults.optionA,
    optionB: typeof raw.optionB === "string" ? raw.optionB : defaults.optionB,
    survivingChoiceId: isTriviaChoiceId(raw.survivingChoiceId)
      ? raw.survivingChoiceId
      : null,
    answeredCount: Math.max(0, Math.floor(num(raw.answeredCount, 0))),
    choiceACount: Math.max(0, Math.floor(num(raw.choiceACount, 0))),
    choiceBCount: Math.max(0, Math.floor(num(raw.choiceBCount, 0))),
    remainingCount: Math.max(0, Math.floor(num(raw.remainingCount, 0))),
    fieldSize: Math.max(0, Math.floor(num(raw.fieldSize, 0))),
    winnerCodes: Array.isArray(raw.winnerCodes)
      ? raw.winnerCodes
          .filter((code): code is string => typeof code === "string" && !!code.trim())
          .map((code) => code.trim().slice(0, 8))
      : typeof (raw as { winnerCode?: unknown }).winnerCode === "string" &&
          (raw as { winnerCode: string }).winnerCode.trim()
        ? [(raw as { winnerCode: string }).winnerCode.trim().slice(0, 8)]
        : [],
    queue: Array.isArray(raw.queue)
      ? raw.queue
          .map((item, index) => normalizeTriviaQueuedQuestion(item, index))
          .filter((item): item is TriviaQueuedQuestion => item != null)
      : [],
    history: Array.isArray(raw.history)
      ? raw.history
          .map((item) => normalizeTriviaHistoryEntry(item))
          .filter((item): item is TriviaRoundHistory => item != null)
      : [],
  };
}

const DERBY_PHASES = new Set<DerbyPhase>(["idle", "racing", "finished"]);

function normalizeDerbyState(
  raw: Partial<DerbyGameState> | undefined,
): DerbyGameState {
  const defaults = createDefaultDerbyState();
  if (!raw || typeof raw !== "object") return defaults;

  const winnerId = isDerbyRacerId(raw.winnerId) ? raw.winnerId : null;
  let phase: DerbyPhase = DERBY_PHASES.has(raw.phase as DerbyPhase)
    ? (raw.phase as DerbyPhase)
    : defaults.phase;
  const startedAt =
    typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt)
      ? raw.startedAt
      : null;
  if (phase === "racing" && (!winnerId || startedAt == null)) {
    phase = "idle";
  }

  return {
    phase,
    theme: isDerbyTheme(raw.theme) ? raw.theme : defaults.theme,
    racerScale: clampDerbyRacerScale(
      raw.racerScale ?? (raw as { horseScale?: unknown }).horseScale,
    ),
    racerNames: normalizeDerbyRacerNames(raw.racerNames),
    winnerId,
    raceId: typeof raw.raceId === "string" ? raw.raceId : null,
    startedAt,
    durationMs:
      typeof raw.durationMs === "number" && raw.durationMs > 0
        ? raw.durationMs
        : defaults.durationMs,
    seed: typeof raw.seed === "number" && Number.isFinite(raw.seed)
      ? raw.seed
      : defaults.seed,
    sequence:
      typeof raw.sequence === "number" && Number.isFinite(raw.sequence)
        ? raw.sequence
        : defaults.sequence,
    voteTallies: normalizeDerbyVoteTallies(raw.voteTallies),
  };
}

function normalizeDerbyVoteTallies(
  raw: Partial<Record<DerbyRacerId, number>> | undefined,
): Record<DerbyRacerId, number> {
  const tallies = emptyDerbyVoteTallies();
  if (!raw || typeof raw !== "object") return tallies;
  for (const id of DERBY_RACER_IDS) {
    const value = raw[id];
    if (typeof value === "number" && Number.isFinite(value)) {
      tallies[id] = Math.max(0, Math.floor(value));
    }
  }
  return tallies;
}

function normalizeDerbyRacerNames(
  raw: DerbyGameState["racerNames"] | undefined,
): DerbyGameState["racerNames"] {
  if (!raw || typeof raw !== "object") return {};
  const next: DerbyGameState["racerNames"] = {};
  for (const theme of DERBY_THEMES) {
    const themeNames = raw[theme];
    if (!themeNames || typeof themeNames !== "object") continue;
    const cleaned: Partial<Record<DerbyRacerId, string>> = {};
    for (const id of DERBY_RACER_IDS) {
      const value = themeNames[id];
      if (typeof value === "string") cleaned[id] = value;
    }
    if (Object.keys(cleaned).length > 0) next[theme] = cleaned;
  }
  return next;
}

function finitePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value * 100) / 100
    : null;
}

function normalizePriceGuesserState(
  raw: Partial<PriceGuesserState> | undefined,
): PriceGuesserState {
  const defaults = createDefaultPriceGuesserState();
  if (!raw || typeof raw !== "object") return defaults;
  return withSyncedPriceGuesserResult({
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : defaults.imageUrl,
    label: typeof raw.label === "string" ? raw.label : defaults.label,
    price: finitePrice(raw.price),
    priceRevealed: Boolean(raw.priceRevealed),
    itemRevealed:
      typeof raw.itemRevealed === "boolean" ? raw.itemRevealed : true,
    photoFit: normalizePhotoFit(raw.photoFit),
    resultOverlay: parsePriceGuesserResult(raw.resultOverlay),
  });
}

function normalizePriceOrderItem(
  raw: Partial<PriceOrderItem> | undefined,
  index: number,
): PriceOrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `item-${index}`;
  return {
    id,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : "",
    label: typeof raw.label === "string" ? raw.label : "",
    price: finitePrice(raw.price),
    priceRevealed: Boolean(raw.priceRevealed),
    itemRevealed:
      typeof raw.itemRevealed === "boolean" ? raw.itemRevealed : true,
    photoFit: normalizePhotoFit(raw.photoFit),
  };
}

function normalizeQuestionTimeTeam(
  raw: Partial<QuestionTimeTeam> | undefined,
  index: number,
  fallbackName: string,
): QuestionTimeTeam | null {
  if (!raw || typeof raw !== "object") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id
      : `team-${index}`;
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : fallbackName,
    score: clampQuestionTimeScore(raw.score),
  };
}

function normalizeQuestionTimeState(
  raw: Partial<QuestionTimeState> & {
    leftTeam?: Partial<QuestionTimeTeam>;
    rightTeam?: Partial<QuestionTimeTeam>;
  } | undefined,
): QuestionTimeState {
  const defaults = createDefaultQuestionTimeState();
  if (!raw || typeof raw !== "object") return defaults;
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

  let teams: QuestionTimeTeam[] = [];
  if (Array.isArray(raw.teams) && raw.teams.length > 0) {
    teams = raw.teams
      .slice(0, MAX_QUESTION_TIME_TEAMS)
      .map((team, index) =>
        normalizeQuestionTimeTeam(team, index, `Team ${index + 1}`),
      )
      .filter((team): team is QuestionTimeTeam => team != null);
  } else if (raw.leftTeam || raw.rightTeam) {
    const left = normalizeQuestionTimeTeam(raw.leftTeam, 0, "Team 1");
    const right = normalizeQuestionTimeTeam(raw.rightTeam, 1, "Team 2");
    teams = [left, right].filter(
      (team): team is QuestionTimeTeam => team != null,
    );
  }
  while (teams.length < MIN_QUESTION_TIME_TEAMS) {
    teams.push(createQuestionTimeTeam(`Team ${teams.length + 1}`));
  }

  return {
    title:
      typeof raw.title === "string" ? raw.title : defaults.title,
    question:
      typeof raw.question === "string" ? raw.question : defaults.question,
    teams,
    timerDurationMs,
    timerRemainingMs,
    timerRunning: timerRunning && timerEndsAt != null,
    timerEndsAt: timerRunning ? timerEndsAt : null,
  };
}

function normalizePriceOrderState(
  raw: Partial<PriceOrderState> | undefined,
): PriceOrderState {
  const defaults = createDefaultPriceOrderState();
  if (!raw || typeof raw !== "object") return defaults;
  const items = Array.isArray(raw.items)
    ? raw.items
        .slice(0, PRICE_ORDER_MAX_ITEMS)
        .map((item, index) => normalizePriceOrderItem(item, index))
        .filter((item): item is PriceOrderItem => item != null)
    : defaults.items;
  const visible = items.filter((item) => item.imageUrl);
  const order = syncPriceOrderSlots(
    Array.isArray(raw.order) ? raw.order : [],
    visible,
  );
  return withSyncedPriceOrderResult({
    items,
    order,
    resultShown: Boolean(raw.resultShown),
  });
}

const JEOPARODY_PHASES = new Set<JeoparodyPhase>(["board", "clue", "answer"]);

function normalizeJeoparodyState(
  raw: Partial<JeoparodyGameState> | undefined,
): JeoparodyGameState {
  const defaults = createSampleJeoparodyGame();
  if (!raw || typeof raw !== "object") return defaults;

  const categories = Array.isArray(raw.categories) && raw.categories.length > 0
    ? raw.categories.map((category, catIndex) => ({
        id: typeof category?.id === "string" ? category.id : `cat-${catIndex}`,
        name: typeof category?.name === "string" ? category.name : `Category ${catIndex + 1}`,
        clues: Array.isArray(category?.clues)
          ? category.clues.map((clue, clueIndex) => ({
              id: typeof clue?.id === "string" ? clue.id : `clue-${catIndex}-${clueIndex}`,
              value:
                typeof clue?.value === "number" && Number.isFinite(clue.value)
                  ? clue.value
                  : (clueIndex + 1) * 200,
              prompt: typeof clue?.prompt === "string" ? clue.prompt : "",
              response: typeof clue?.response === "string" ? clue.response : "",
              played: Boolean(clue?.played),
            }))
          : [],
      }))
    : defaults.categories;

  const contestants =
    Array.isArray(raw.contestants) && raw.contestants.length > 0
      ? raw.contestants.map((contestant, index) => ({
          id:
            typeof contestant?.id === "string"
              ? contestant.id
              : `player-${index}`,
          name:
            typeof contestant?.name === "string" && contestant.name.trim()
              ? contestant.name
              : `Player ${index + 1}`,
          score:
            typeof contestant?.score === "number" &&
            Number.isFinite(contestant.score)
              ? contestant.score
              : 0,
        }))
      : defaults.contestants;

  const selectedClueId =
    typeof raw.selectedClueId === "string" ? raw.selectedClueId : null;
  const hasSelected = selectedClueId
    ? categories.some((category) =>
        category.clues.some((clue) => clue.id === selectedClueId),
      )
    : false;

  let phase: JeoparodyPhase = JEOPARODY_PHASES.has(raw.phase as JeoparodyPhase)
    ? (raw.phase as JeoparodyPhase)
    : defaults.phase;
  if (!hasSelected) phase = "board";

  return {
    categories,
    contestants,
    selectedClueId: hasSelected ? selectedClueId : null,
    phase,
    showScores: raw.showScores ?? true,
  };
}

export function normalizeSuiteState(
  raw: LegacySuiteState | null | undefined,
): SuiteState {
  const defaults = createDefaultSuiteState();
  if (!raw || typeof raw !== "object") return defaults;

  const activeGame = normalizeActiveGame(raw.activeGame, defaults.activeGame);
  // Older events only had activeGame; keep spectator on that game until changed.
  const spectatorGame = normalizeSpectatorScreen(
    raw.spectatorGame,
    activeGame,
  );

  const { draw: _legacyDraw, ...rawWithoutDraw } = raw;

  const spectatorCovered =
    raw.spectatorCovered ?? raw.audienceCovered ?? defaults.spectatorCovered;

  return {
    ...defaults,
    ...rawWithoutDraw,
    activeGame,
    spectatorGame,
    spectatorCovered,
    feud: {
      ...createSampleFeudGame(),
      ...raw.feud,
      showHeader: raw.feud?.showHeader ?? true,
      leftTeam: {
        name: raw.feud?.leftTeam?.name ?? "Left",
        score:
          typeof raw.feud?.leftTeam?.score === "number"
            ? raw.feud.leftTeam.score
            : 0,
      },
      rightTeam: {
        name: raw.feud?.rightTeam?.name ?? "Right",
        score:
          typeof raw.feud?.rightTeam?.score === "number"
            ? raw.feud.rightTeam.score
            : 0,
      },
      showTeamScores: raw.feud?.showTeamScores ?? true,
      showAnswerScores: raw.feud?.showAnswerScores ?? true,
      awardTeam: raw.feud?.awardTeam === "right" ? "right" : "left",
      rounds: raw.feud?.rounds?.length
        ? raw.feud.rounds
        : createSampleFeudGame().rounds,
    },
    wheel: {
      ...createDefaultWheelState(),
      ...raw.wheel,
      zoom: typeof raw.wheel?.zoom === "number" ? raw.wheel.zoom : 1,
      showLetterLegend: raw.wheel?.showLetterLegend ?? true,
      topic: typeof raw.wheel?.topic === "string" ? raw.wheel.topic : "",
      wrongCount:
        typeof raw.wheel?.wrongCount === "number" ? raw.wheel.wrongCount : 0,
    },
    liveDrawer: normalizeLiveDrawerState(raw.liveDrawer ?? raw.draw),
    takeIt: normalizeTakeItState(raw.takeIt ?? raw.deal),
    poll: normalizePollState(raw.poll),
    pollHistory: normalizePollHistory(raw.pollHistory),
    messageBoard: normalizeMessageBoardState(raw.messageBoard),
    derby: normalizeDerbyState(raw.derby),
    jeoparody: normalizeJeoparodyState(raw.jeoparody),
    trivia: normalizeTriviaState(raw.trivia),
    priceGuesser: normalizePriceGuesserState(raw.priceGuesser),
    priceOrder: normalizePriceOrderState(raw.priceOrder),
    questionTime: normalizeQuestionTimeState(raw.questionTime),
    pictionary: normalizePictionaryState(raw.pictionary),
  };
}

export function suiteToSnapshot(
  suite: SuiteState,
  revision: number,
  poolSummary: PoolSummary,
  poolTokens: LiveDrawerToken[],
  calledTokens: LiveDrawerToken[] = [],
): EventSnapshot {
  return {
    ...suite,
    revision,
    poolSummary,
    poolTokens,
    calledTokens,
  };
}

export function loadSuiteState(): SuiteState {
  if (typeof window === "undefined") return createDefaultSuiteState();
  try {
    const raw = localStorage.getItem(SUITE_STORAGE_KEY);
    if (!raw) return createDefaultSuiteState();
    return normalizeSuiteState(JSON.parse(raw) as LegacySuiteState);
  } catch {
    return createDefaultSuiteState();
  }
}

export function saveSuiteState(state: SuiteState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUITE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export const ACTIVE_GAME_LABELS: Record<ActiveGame, string> = {
  idle: "Home",
  feud: "Friendly Feud",
  wheel: "Wheel of Riches",
  liveDrawer: "Live Drawer",
  takeIt: "Take It or Leave It",
  poll: "Poll",
  messageBoard: "Message Board",
  derby: "Derby Race",
  jeoparody: "Jeoparody",
  trivia: "Elimination Trivia",
  priceGuesser: "Price Guesser",
  priceOrder: "Price Order",
  questionTime: "Question Time",
  pictionary: "Pictionary",
};

export const SPECTATOR_SCREEN_LABELS: Record<SpectatorScreen, string> =
  ACTIVE_GAME_LABELS;

export const SPECTATOR_SCREENS: SpectatorScreen[] = [
  "idle",
  "feud",
  "wheel",
  "derby",
  "trivia",
  "priceGuesser",
  "priceOrder",
  "questionTime",
  "pictionary",
  "jeoparody",
  "takeIt",
  "liveDrawer",
  "poll",
  "messageBoard",
];

/** @deprecated use spectatorCovered */
export function isSpectatorCovered(state: SuiteState): boolean {
  return state.spectatorCovered;
}
