"use client";

import { useEffect, useRef } from "react";
import {
  normalizeSuiteState,
  type EventSnapshot,
  type SuiteState,
} from "@/lib/suite-state";

type SyncMsg =
  | { type: "snapshot"; payload: EventSnapshot }
  | { type: "error"; message: string };

export function useEventSync(
  setSnapshot: (snapshot: EventSnapshot) => void,
  enabled = true,
) {
  const revisionRef = useRef(0);
  const setSnapshotRef = useRef(setSnapshot);
  setSnapshotRef.current = setSnapshot;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let closed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;

    const applySnapshot = (snapshot: EventSnapshot) => {
      if (snapshot.revision <= revisionRef.current) return;
      revisionRef.current = snapshot.revision;
      setSnapshotRef.current(snapshot);
    };

    const pollOnce = async () => {
      try {
        const res = await fetch(
          `/api/event?since=${revisionRef.current}`,
          { cache: "no-store" },
        );
        if (res.status === 204) return;
        if (res.ok) {
          const data = (await res.json()) as EventSnapshot;
          applySnapshot(data);
        }
      } catch {
        // ignore
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollOnce();
      pollTimer = setInterval(pollOnce, 1000);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    if ("EventSource" in window) {
      es = new EventSource("/api/event/stream");
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as SyncMsg;
          if (msg.type === "snapshot") applySnapshot(msg.payload);
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!closed) startPolling();
      };
    } else {
      startPolling();
    }

    return () => {
      closed = true;
      es?.close();
      stopPolling();
    };
  }, [enabled]);
}

export function snapshotToSuite(snapshot: EventSnapshot): SuiteState {
  const { revision: _r, poolSummary: _ps, poolTokens: _pt, ...suite } =
    snapshot;
  return normalizeSuiteState(suite);
}
