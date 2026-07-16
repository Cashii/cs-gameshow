"use client";

import { useEffect, useRef } from "react";
import {
  SUITE_FALLBACK_KEY,
  SUITE_SYNC_CHANNEL,
  type SuiteState,
} from "@/lib/suite-state";

type SyncMsg =
  | { type: "STATE_PUSH"; payload: SuiteState }
  | { type: "REQUEST_STATE" };

export function useBroadcastSync(
  state: SuiteState,
  setState: (updater: SuiteState | ((prev: SuiteState) => SuiteState)) => void,
  role: "admin" | "audience",
) {
  const bcRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(state);
  const isAudience = role === "audience";

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("BroadcastChannel" in window)) return;

    const bc = new BroadcastChannel(SUITE_SYNC_CHANNEL);
    bcRef.current = bc;

    bc.onmessage = (ev: MessageEvent) => {
      const msg = (ev.data || {}) as SyncMsg;
      if (msg.type === "STATE_PUSH" && isAudience) {
        setState(msg.payload);
      } else if (msg.type === "REQUEST_STATE" && !isAudience) {
        bc.postMessage({ type: "STATE_PUSH", payload: stateRef.current });
      }
    };

    if (isAudience) {
      bc.postMessage({ type: "REQUEST_STATE" });
    }

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [isAudience, setState]);

  useEffect(() => {
    if (isAudience) return;
    if (bcRef.current) {
      bcRef.current.postMessage({ type: "STATE_PUSH", payload: state });
    }
    try {
      localStorage.setItem(SUITE_FALLBACK_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, isAudience]);

  useEffect(() => {
    if (!isAudience) return;

    const applyFallback = () => {
      try {
        const raw = localStorage.getItem(SUITE_FALLBACK_KEY);
        if (raw) setState(JSON.parse(raw) as SuiteState);
      } catch {
        // ignore
      }
    };

    if (!("BroadcastChannel" in window)) {
      const t = setInterval(applyFallback, 400);
      return () => clearInterval(t);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === SUITE_FALLBACK_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue) as SuiteState);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isAudience, setState]);
}
