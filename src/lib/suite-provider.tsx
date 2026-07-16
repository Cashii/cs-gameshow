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
  saveSuiteState,
  SUITE_FALLBACK_KEY,
  type ActiveGame,
  type SuiteState,
} from "@/lib/suite-state";
import { useBroadcastSync } from "@/lib/sync/useBroadcastSync";
import type { FeudGameState, FeudRound } from "@/lib/feud/types";
import type { WheelGameState } from "@/lib/wheel/types";
import type { DrawGameState } from "@/lib/draw/types";

function loadFallbackSuiteState(): SuiteState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUITE_FALLBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SuiteState;
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
  updateFeud: (updater: (feud: FeudGameState) => FeudGameState) => void;
  updateWheel: (updater: (wheel: WheelGameState) => WheelGameState) => void;
  updateDraw: (updater: (draw: DrawGameState) => DrawGameState) => void;
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

  const updateDraw = useCallback(
    (updater: (draw: DrawGameState) => DrawGameState) => {
      setState((prev) => ({ ...prev, draw: updater(prev.draw) }));
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
      updateFeud,
      updateWheel,
      updateDraw,
      currentFeudRound,
    }),
    [
      state,
      setActiveGame,
      updateFeud,
      updateWheel,
      updateDraw,
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
