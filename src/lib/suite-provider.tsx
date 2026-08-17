"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createDefaultSuiteState,
  loadSuiteState,
  normalizeSuiteState,
  saveSuiteState,
  SUITE_FALLBACK_KEY,
  type ActiveGame,
  type SuiteState,
} from "@/lib/suite-state";
import { useBroadcastSync } from "@/lib/sync/useBroadcastSync";
import type { FeudGameState, FeudRound } from "@/lib/feud/types";
import type { WheelGameState } from "@/lib/wheel/types";
import type { LiveDrawerGameState } from "@/lib/live-drawer/types";
import {
  createDefaultTakeItState,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";

function loadFallbackSuiteState(): SuiteState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUITE_FALLBACK_KEY);
    if (!raw) return null;
    return normalizeSuiteState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function initialStateForRole(role: "admin" | "audience"): SuiteState {
  if (typeof window === "undefined") return createDefaultSuiteState();
  if (role === "admin") return loadSuiteState();
  return loadFallbackSuiteState() ?? createDefaultSuiteState();
}

type SuiteContextValue = {
  state: SuiteState;
  setState: React.Dispatch<React.SetStateAction<SuiteState>>;
  setActiveGame: (game: ActiveGame) => void;
  setAudienceCovered: (covered: boolean) => void;
  updateFeud: (updater: (feud: FeudGameState) => FeudGameState) => void;
  updateWheel: (updater: (wheel: WheelGameState) => WheelGameState) => void;
  updateLiveDrawer: (
    updater: (game: LiveDrawerGameState) => LiveDrawerGameState,
  ) => void;
  updateTakeIt: (updater: (game: TakeItGameState) => TakeItGameState) => void;
  currentFeudRound: FeudRound | undefined;
};

const SuiteContext = createContext<SuiteContextValue | null>(null);

export function SuiteProvider({
  role,
  children,
}: {
  role: "admin" | "audience";
  children: ReactNode;
}) {
  const [state, setState] = useState<SuiteState>(() =>
    initialStateForRole(role),
  );

  useEffect(() => {
    if (role !== "admin") return;
    saveSuiteState(state);
  }, [state, role]);

  useBroadcastSync(state, setState, role);

  const setActiveGame = useCallback((game: ActiveGame) => {
    setState((prev) => ({ ...prev, activeGame: game }));
  }, []);

  const setAudienceCovered = useCallback((covered: boolean) => {
    setState((prev) => ({ ...prev, audienceCovered: covered }));
  }, []);

  const updateFeud = useCallback(
    (updater: (feud: FeudGameState) => FeudGameState) => {
      setState((prev) => ({ ...prev, feud: updater(prev.feud) }));
    },
    [],
  );

  const updateWheel = useCallback(
    (updater: (wheel: WheelGameState) => WheelGameState) => {
      setState((prev) => ({ ...prev, wheel: updater(prev.wheel) }));
    },
    [],
  );

  const updateLiveDrawer = useCallback(
    (updater: (game: LiveDrawerGameState) => LiveDrawerGameState) => {
      setState((prev) => ({
        ...prev,
        liveDrawer: updater(prev.liveDrawer),
      }));
    },
    [],
  );

  const updateTakeIt = useCallback(
    (updater: (game: TakeItGameState) => TakeItGameState) => {
      setState((prev) => ({
        ...prev,
        takeIt: updater(prev.takeIt ?? createDefaultTakeItState()),
      }));
    },
    [],
  );

  const currentFeudRound = useMemo(
    () => state.feud.rounds[state.feud.currentRoundIndex],
    [state.feud],
  );

  const value = useMemo(
    () => ({
      state,
      setState,
      setActiveGame,
      setAudienceCovered,
      updateFeud,
      updateWheel,
      updateLiveDrawer,
      updateTakeIt,
      currentFeudRound,
    }),
    [
      state,
      setActiveGame,
      setAudienceCovered,
      updateFeud,
      updateWheel,
      updateLiveDrawer,
      updateTakeIt,
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
