"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createDefaultSuiteState,
  type ActiveGame,
  type EventSnapshot,
  type SpectatorScreen,
  type SuiteState,
} from "@/lib/suite-state";
import { snapshotToSuite, useEventSync } from "@/lib/sync/useEventSync";
import {
  publishLocalSuite,
  readLocalSuite,
  useLocalSuiteSync,
} from "@/lib/sync/useLocalSuiteSync";
import type { FeudGameState, FeudRound } from "@/lib/feud/types";
import type { WheelGameState } from "@/lib/wheel/types";
import type { LiveDrawerGameState } from "@/lib/live-drawer/types";
import type { PoolSummary, LiveDrawerToken } from "@/lib/live-drawer/types";
import {
  createDefaultDerbyState,
  emptyDerbyVoteTallies,
  type DerbyGameState,
} from "@/lib/derby/types";
import {
  createDefaultTakeItState,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";
import type { PollState } from "@/lib/poll/types";
import {
  createDefaultMessageBoardState,
  type MessageBoardState,
} from "@/lib/message-board/types";
import type { JeoparodyGameState } from "@/lib/jeoparody/types";
import { createSampleJeoparodyGame } from "@/lib/jeoparody/defaults";
import {
  createDefaultPriceGuesserState,
  withSyncedPriceGuesserResult,
  type PriceGuesserState,
} from "@/lib/price-guesser/types";
import {
  createDefaultPriceOrderState,
  withSyncedPriceOrderResult,
  type PriceOrderState,
} from "@/lib/price-order/types";
import {
  createDefaultQuestionTimeState,
  type QuestionTimeState,
} from "@/lib/question-time/types";
import {
  createDefaultPictionaryState,
  type PictionaryState,
} from "@/lib/pictionary/types";

export type SuiteRole = "operator" | "spectator" | "hostess" | "player";

type SuiteContextValue = {
  role: SuiteRole;
  state: SuiteState;
  snapshot: EventSnapshot | null;
  poolSummary: PoolSummary;
  poolTokens: LiveDrawerToken[];
  calledTokens: LiveDrawerToken[];
  revision: number;
  connected: boolean;
  setState: React.Dispatch<React.SetStateAction<SuiteState>>;
  setActiveGame: (game: ActiveGame) => void;
  setSpectatorGame: (game: SpectatorScreen) => void;
  setSpectatorCovered: (covered: boolean) => void;
  updateFeud: (updater: (feud: FeudGameState) => FeudGameState) => void;
  updateWheel: (updater: (wheel: WheelGameState) => WheelGameState) => void;
  updateLiveDrawer: (
    updater: (game: LiveDrawerGameState) => LiveDrawerGameState,
  ) => void;
  updateTakeIt: (updater: (game: TakeItGameState) => TakeItGameState) => void;
  updatePoll: (updater: (poll: PollState) => PollState) => void;
  updateMessageBoard: (
    updater: (board: MessageBoardState) => MessageBoardState,
  ) => void;
  updateDerby: (updater: (game: DerbyGameState) => DerbyGameState) => void;
  updateJeoparody: (
    updater: (game: JeoparodyGameState) => JeoparodyGameState,
  ) => void;
  updatePriceGuesser: (
    updater: (game: PriceGuesserState) => PriceGuesserState,
  ) => void;
  updatePriceOrder: (
    updater: (game: PriceOrderState) => PriceOrderState,
  ) => void;
  updateQuestionTime: (
    updater: (game: QuestionTimeState) => QuestionTimeState,
  ) => void;
  updatePictionary: (
    updater: (game: PictionaryState) => PictionaryState,
  ) => void;
  patchSuite: (patch: Partial<SuiteState>) => Promise<void>;
  refreshSnapshot: () => Promise<void>;
  applyServerSnapshot: (snapshot: EventSnapshot) => void;
  currentFeudRound: FeudRound | undefined;
};

const SuiteContext = createContext<SuiteContextValue | null>(null);

function emptySnapshot(): EventSnapshot {
  const suite = createDefaultSuiteState();
  return {
    ...suite,
    revision: 0,
    poolSummary: {},
    poolTokens: [],
    calledTokens: [],
  };
}

function mergeSuiteIntoSnapshot(
  prev: EventSnapshot,
  suite: SuiteState,
): EventSnapshot {
  return {
    ...prev,
    ...suite,
    poolSummary: prev.poolSummary,
    poolTokens: prev.poolTokens,
    calledTokens: prev.calledTokens,
    revision: prev.revision,
  };
}

/** Draw/reveal is written by the live-drawer API, not localStorage. Prefer the newer sequence, then more tokens. */
function pickLiveDrawer(
  a: LiveDrawerGameState,
  b: LiveDrawerGameState,
): LiveDrawerGameState {
  if (a.sequence !== b.sequence) {
    return a.sequence > b.sequence ? a : b;
  }
  if (a.revealedTokens.length !== b.revealedTokens.length) {
    return a.revealedTokens.length > b.revealedTokens.length ? a : b;
  }
  return {
    ...b,
    numberScale: a.numberScale,
  };
}

/** Keep local derby edits, but pull live phone vote tallies for the same race. */
function mergeDerbyVotes(
  local: DerbyGameState | undefined,
  remote: DerbyGameState | undefined,
): DerbyGameState {
  const base = local ?? createDefaultDerbyState();
  const next = remote ?? createDefaultDerbyState();
  if (base.raceId && base.raceId === next.raceId) {
    return {
      ...base,
      voteTallies: next.voteTallies ?? emptyDerbyVoteTallies(),
    };
  }
  return base;
}

/** Keep local take-it edits, but pull live phone pick counts for the same round. */
function mergeTakeItPicks(
  local: TakeItGameState | undefined,
  remote: TakeItGameState | undefined,
): TakeItGameState {
  const base = local ?? createDefaultTakeItState();
  const next = remote ?? createDefaultTakeItState();
  if (base.roundId && base.roundId === next.roundId) {
    return {
      ...base,
      pickCounts: next.pickCounts ?? {},
    };
  }
  return base;
}

async function fetchSnapshot(): Promise<EventSnapshot> {
  const res = await fetch("/api/event", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load event");
  return (await res.json()) as EventSnapshot;
}

export function SuiteProvider({
  role,
  children,
  syncEnabled = true,
}: {
  role: SuiteRole;
  children: ReactNode;
  syncEnabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const snapshotRef = useRef<EventSnapshot | null>(null);
  const confirmedRevisionRef = useRef(0);
  const persistQueuedRef = useRef(false);
  const persistInFlightRef = useRef(false);
  const dirtyRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedJsonRef = useRef<string | null>(null);
  const lastLocalBroadcastAtRef = useRef(0);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);

  const replaceSnapshot = useCallback((next: EventSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setConnected(true);
  }, []);

  const rememberPersisted = useCallback((suite: SuiteState) => {
    lastPersistedJsonRef.current = JSON.stringify(suite);
  }, []);

  const applyRemoteSnapshot = useCallback(
    (next: EventSnapshot) => {
      const local = snapshotRef.current;
      if (next.revision < confirmedRevisionRef.current) return;

      const recentlyBroadcast =
        Date.now() - lastLocalBroadcastAtRef.current < 3000;

      const mergeLivePoll = (base: EventSnapshot): EventSnapshot => ({
        ...base,
        poolSummary: next.poolSummary,
        poolTokens: next.poolTokens,
        calledTokens: next.calledTokens ?? [],
        poll: next.poll,
        trivia: next.trivia,
        derby: mergeDerbyVotes(base.derby, next.derby),
        takeIt: mergeTakeItPicks(base.takeIt, next.takeIt),
        liveDrawer: pickLiveDrawer(base.liveDrawer, next.liveDrawer),
        revision: Math.max(base.revision, next.revision),
      });

      if (role === "spectator" && recentlyBroadcast && local) {
        confirmedRevisionRef.current = Math.max(
          confirmedRevisionRef.current,
          next.revision,
        );
        replaceSnapshot(mergeLivePoll(local));
        setConnected(true);
        return;
      }

      if (dirtyRef.current && local) {
        confirmedRevisionRef.current = Math.max(
          confirmedRevisionRef.current,
          next.revision,
        );
        replaceSnapshot(mergeLivePoll(local));
        setConnected(true);
        return;
      }
      if (next.revision <= confirmedRevisionRef.current) {
        if ((role === "operator" || role === "player") && local) {
          replaceSnapshot({
            ...local,
            poll: next.poll,
            trivia: next.trivia,
            derby: mergeDerbyVotes(local.derby, next.derby),
            takeIt: mergeTakeItPicks(local.takeIt, next.takeIt),
          });
          setConnected(true);
        }
        return;
      }
      confirmedRevisionRef.current = next.revision;
      rememberPersisted(snapshotToSuite(next));
      replaceSnapshot(next);
    },
    [rememberPersisted, replaceSnapshot, role],
  );

  useEventSync(applyRemoteSnapshot, syncEnabled);

  const applyBroadcastSuite = useCallback(
    (suite: SuiteState) => {
      lastLocalBroadcastAtRef.current = Date.now();
      const prev = snapshotRef.current ?? emptySnapshot();
      replaceSnapshot(
        mergeSuiteIntoSnapshot(prev, {
          ...suite,
          liveDrawer: pickLiveDrawer(prev.liveDrawer, suite.liveDrawer),
        }),
      );
      setConnected(true);
    },
    [replaceSnapshot],
  );

  useLocalSuiteSync(
    applyBroadcastSuite,
    syncEnabled && role === "spectator",
  );

  useEffect(() => {
    if (!syncEnabled) return;
    fetchSnapshot()
      .then((remote) => {
        applyRemoteSnapshot(remote);
        if (role !== "spectator") return;
        const stored = readLocalSuite();
        if (!stored) return;
        const prev = snapshotRef.current ?? remote;
        replaceSnapshot(
          mergeSuiteIntoSnapshot(prev, {
            ...stored,
            liveDrawer: pickLiveDrawer(stored.liveDrawer, prev.liveDrawer),
          }),
        );
      })
      .catch(() => setConnected(false));
  }, [applyRemoteSnapshot, replaceSnapshot, role, syncEnabled]);

  const persistLatest = useCallback(async () => {
    if (role !== "operator") return;
    persistQueuedRef.current = true;
    if (persistInFlightRef.current) return;
    persistInFlightRef.current = true;

    while (persistQueuedRef.current) {
      persistQueuedRef.current = false;
      const current = snapshotRef.current;
      if (!current) break;
      const suite = snapshotToSuite(current);
      const json = JSON.stringify(suite);
      if (json === lastPersistedJsonRef.current) {
        dirtyRef.current = false;
        continue;
      }
      try {
        const res = await fetch("/api/event", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suite }),
        });
        const data = (await res.json()) as { error?: string; revision?: number };
        if (!res.ok) throw new Error(data.error ?? "Update failed");
        lastPersistedJsonRef.current = json;
        if (typeof data.revision === "number") {
          confirmedRevisionRef.current = Math.max(
            confirmedRevisionRef.current,
            data.revision,
          );
          if (snapshotRef.current) {
            snapshotRef.current = {
              ...snapshotRef.current,
              revision: data.revision,
            };
          }
        }
      } catch {
        persistQueuedRef.current = false;
        dirtyRef.current = false;
        try {
          const next = await fetchSnapshot();
          confirmedRevisionRef.current = next.revision;
          rememberPersisted(snapshotToSuite(next));
          replaceSnapshot(next);
        } catch {
          // keep optimistic local state
        }
      }
    }

    persistInFlightRef.current = false;
    if (!persistQueuedRef.current) dirtyRef.current = false;
  }, [rememberPersisted, replaceSnapshot, role]);

  const schedulePersist = useCallback(() => {
    if (role !== "operator") return;
    dirtyRef.current = true;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void persistLatest();
    }, 200);
  }, [persistLatest, role]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const applyLocalSuite = useCallback(
    (updater: (prev: SuiteState) => SuiteState) => {
      const prev = snapshotRef.current ?? emptySnapshot();
      const nextSuite = updater(snapshotToSuite(prev));
      const next: EventSnapshot = {
        ...prev,
        ...nextSuite,
      };
      const prevJson = JSON.stringify(snapshotToSuite(prev));
      const nextJson = JSON.stringify(nextSuite);
      if (prevJson === nextJson) return;
      replaceSnapshot(next);
      if (role === "operator") {
        lastLocalBroadcastAtRef.current = Date.now();
        publishLocalSuite(nextSuite);
      }
      schedulePersist();
    },
    [replaceSnapshot, role, schedulePersist],
  );

  const state = useMemo(
    () => (snapshot ? snapshotToSuite(snapshot) : createDefaultSuiteState()),
    [snapshot],
  );

  const patchSuite = useCallback(
    async (patch: Partial<SuiteState>) => {
      applyLocalSuite((prev) => ({ ...prev, ...patch }));
    },
    [applyLocalSuite],
  );

  const setState = useCallback(
    (updater: SuiteState | ((prev: SuiteState) => SuiteState)) => {
      applyLocalSuite((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [applyLocalSuite],
  );

  const setActiveGame = useCallback(
    (game: ActiveGame) => {
      applyLocalSuite((prev) => ({ ...prev, activeGame: game }));
    },
    [applyLocalSuite],
  );

  const setSpectatorGame = useCallback(
    (game: SpectatorScreen) => {
      applyLocalSuite((prev) => ({ ...prev, spectatorGame: game }));
    },
    [applyLocalSuite],
  );

  const setSpectatorCovered = useCallback(
    (covered: boolean) => {
      applyLocalSuite((prev) => ({ ...prev, spectatorCovered: covered }));
    },
    [applyLocalSuite],
  );

  const updateFeud = useCallback(
    (updater: (feud: FeudGameState) => FeudGameState) => {
      applyLocalSuite((prev) => ({ ...prev, feud: updater(prev.feud) }));
    },
    [applyLocalSuite],
  );

  const updateWheel = useCallback(
    (updater: (wheel: WheelGameState) => WheelGameState) => {
      applyLocalSuite((prev) => ({ ...prev, wheel: updater(prev.wheel) }));
    },
    [applyLocalSuite],
  );

  const updateLiveDrawer = useCallback(
    (updater: (game: LiveDrawerGameState) => LiveDrawerGameState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        liveDrawer: updater(prev.liveDrawer),
      }));
    },
    [applyLocalSuite],
  );

  const updateTakeIt = useCallback(
    (updater: (game: TakeItGameState) => TakeItGameState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        takeIt: updater(prev.takeIt ?? createDefaultTakeItState()),
      }));
    },
    [applyLocalSuite],
  );

  const updatePoll = useCallback(
    (updater: (poll: PollState) => PollState) => {
      applyLocalSuite((prev) => ({ ...prev, poll: updater(prev.poll) }));
    },
    [applyLocalSuite],
  );

  const updateMessageBoard = useCallback(
    (updater: (board: MessageBoardState) => MessageBoardState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        messageBoard: updater(
          prev.messageBoard ?? createDefaultMessageBoardState(),
        ),
      }));
    },
    [applyLocalSuite],
  );

  const updateDerby = useCallback(
    (updater: (game: DerbyGameState) => DerbyGameState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        derby: updater(prev.derby ?? createDefaultDerbyState()),
      }));
    },
    [applyLocalSuite],
  );

  const updateJeoparody = useCallback(
    (updater: (game: JeoparodyGameState) => JeoparodyGameState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        jeoparody: updater(prev.jeoparody ?? createSampleJeoparodyGame()),
      }));
    },
    [applyLocalSuite],
  );

  const updatePriceGuesser = useCallback(
    (updater: (game: PriceGuesserState) => PriceGuesserState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        priceGuesser: withSyncedPriceGuesserResult(
          updater(prev.priceGuesser ?? createDefaultPriceGuesserState()),
        ),
      }));
    },
    [applyLocalSuite],
  );

  const updatePriceOrder = useCallback(
    (updater: (game: PriceOrderState) => PriceOrderState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        priceOrder: withSyncedPriceOrderResult(
          updater(prev.priceOrder ?? createDefaultPriceOrderState()),
        ),
      }));
    },
    [applyLocalSuite],
  );

  const updateQuestionTime = useCallback(
    (updater: (game: QuestionTimeState) => QuestionTimeState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        questionTime: updater(
          prev.questionTime ?? createDefaultQuestionTimeState(),
        ),
      }));
    },
    [applyLocalSuite],
  );

  const updatePictionary = useCallback(
    (updater: (game: PictionaryState) => PictionaryState) => {
      applyLocalSuite((prev) => ({
        ...prev,
        pictionary: updater(
          prev.pictionary ?? createDefaultPictionaryState(),
        ),
      }));
    },
    [applyLocalSuite],
  );

  const applyServerSnapshot = useCallback(
    (next: EventSnapshot) => {
      confirmedRevisionRef.current = Math.max(
        confirmedRevisionRef.current,
        next.revision,
      );
      rememberPersisted(snapshotToSuite(next));
      replaceSnapshot(next);
      if (role === "operator") {
        lastLocalBroadcastAtRef.current = Date.now();
        publishLocalSuite(snapshotToSuite(next));
      }
    },
    [rememberPersisted, replaceSnapshot, role],
  );

  const refreshSnapshot = useCallback(async () => {
    refreshQueuedRef.current = true;
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    const pending = (async () => {
      try {
        while (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          const next = await fetchSnapshot();
          applyServerSnapshot(next);
        }
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = pending;
    return pending;
  }, [applyServerSnapshot]);

  const currentFeudRound = useMemo(
    () => state.feud.rounds[state.feud.currentRoundIndex],
    [state.feud],
  );

  const value = useMemo(
    () => ({
      role,
      state,
      snapshot,
      poolSummary: snapshot?.poolSummary ?? {},
      poolTokens: snapshot?.poolTokens ?? [],
      calledTokens: snapshot?.calledTokens ?? [],
      revision: snapshot?.revision ?? 0,
      connected,
      setState,
      setActiveGame,
      setSpectatorGame,
      setSpectatorCovered,
      updateFeud,
      updateWheel,
      updateLiveDrawer,
      updateTakeIt,
      updatePoll,
      updateMessageBoard,
      updateDerby,
      updateJeoparody,
      updatePriceGuesser,
      updatePriceOrder,
      updateQuestionTime,
      updatePictionary,
      patchSuite,
      refreshSnapshot,
      applyServerSnapshot,
      currentFeudRound,
    }),
    [
      role,
      state,
      snapshot,
      connected,
      setState,
      setActiveGame,
      setSpectatorGame,
      setSpectatorCovered,
      updateFeud,
      updateWheel,
      updateLiveDrawer,
      updateTakeIt,
      updatePoll,
      updateMessageBoard,
      updateDerby,
      updateJeoparody,
      updatePriceGuesser,
      updatePriceOrder,
      updateQuestionTime,
      updatePictionary,
      patchSuite,
      refreshSnapshot,
      applyServerSnapshot,
      currentFeudRound,
    ],
  );

  return (
    <SuiteContext.Provider value={value}>{children}</SuiteContext.Provider>
  );
}

export function useSuite() {
  const ctx = useContext(SuiteContext);
  if (!ctx) throw new Error("useSuite must be used within SuiteProvider");
  return ctx;
}

export function useEventSnapshot() {
  const { snapshot, poolSummary, poolTokens, revision } = useSuite();
  return {
    snapshot: snapshot ?? emptySnapshot(),
    poolSummary,
    poolTokens,
    revision,
  };
}
