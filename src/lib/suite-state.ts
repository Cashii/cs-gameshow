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
  createDefaultTakeItState,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";
import {
  createEmptyPoll,
  type PollState,
} from "@/lib/poll/types";
import {
  createDefaultMessageBoardState,
  type MessageBoardState,
} from "@/lib/message-board/types";
import {
  clampDerbyRacerScale,
  createDefaultDerbyState,
  isDerbyRacerId,
  isDerbyTheme,
  type DerbyGameState,
  type DerbyPhase,
} from "@/lib/derby/types";
import { createSampleJeoparodyGame } from "@/lib/jeoparody/defaults";
import type { JeoparodyGameState, JeoparodyPhase } from "@/lib/jeoparody/types";
import {
  createDefaultTriviaState,
  isTriviaChoiceId,
  type TriviaGameState,
  type TriviaStatus,
} from "@/lib/trivia/types";

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
  | "trivia";
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
  messageBoard: MessageBoardState;
  derby: DerbyGameState;
  jeoparody: JeoparodyGameState;
  trivia: TriviaGameState;
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
    raw === "trivia"
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
    messageBoard: createDefaultMessageBoardState(),
    derby: createDefaultDerbyState(),
    jeoparody: createSampleJeoparodyGame(),
    trivia: createDefaultTriviaState(),
  };
}

function normalizeTakeItState(
  raw: LegacySuiteState["takeIt"] | LegacySuiteState["deal"] | undefined,
): TakeItGameState {
  const defaults = createDefaultTakeItState();
  if (!raw) return defaults;

  const legacyAccepted =
    "dealAccepted" in raw ? raw.dealAccepted : undefined;

  return {
    ...defaults,
    ...raw,
    values: raw.values?.length === 9 ? raw.values : defaults.values,
    cases: Array.isArray(raw.cases) ? raw.cases : defaults.cases,
    tookIt:
      typeof raw.tookIt === "boolean" || raw.tookIt === null
        ? raw.tookIt
        : typeof legacyAccepted === "boolean" || legacyAccepted === null
          ? legacyAccepted
          : defaults.tookIt,
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

function normalizeMessageBoardState(
  raw: Partial<MessageBoardState> | undefined,
): MessageBoardState {
  const defaults = createDefaultMessageBoardState();
  if (!raw || typeof raw !== "object") return defaults;
  return {
    text: typeof raw.text === "string" ? raw.text : defaults.text,
  };
}

const TRIVIA_STATUSES = new Set<TriviaStatus>([
  "idle",
  "open",
  "locked",
  "revealed",
  "finished",
]);

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
  };
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
    },
    liveDrawer: normalizeLiveDrawerState(raw.liveDrawer ?? raw.draw),
    takeIt: normalizeTakeItState(raw.takeIt ?? raw.deal),
    poll: normalizePollState(raw.poll),
    messageBoard: normalizeMessageBoardState(raw.messageBoard),
    derby: normalizeDerbyState(raw.derby),
    jeoparody: normalizeJeoparodyState(raw.jeoparody),
    trivia: normalizeTriviaState(raw.trivia),
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
};

export const SPECTATOR_SCREEN_LABELS: Record<SpectatorScreen, string> =
  ACTIVE_GAME_LABELS;

export const SPECTATOR_SCREENS: SpectatorScreen[] = [
  "idle",
  "feud",
  "wheel",
  "takeIt",
  "derby",
  "jeoparody",
  "trivia",
  "liveDrawer",
  "poll",
  "messageBoard",
];

/** @deprecated use spectatorCovered */
export function isSpectatorCovered(state: SuiteState): boolean {
  return state.spectatorCovered;
}
