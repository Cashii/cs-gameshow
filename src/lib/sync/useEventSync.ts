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

const FALLBACK_POLL_MS = 2000;

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
    let pollTimer = 0;
    let es: EventSource | null = null;
    let opened = false;
    let errorsBeforeOpen = 0;

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
      if (closed || pollTimer) return;
      void pollOnce();
      pollTimer = window.setInterval(pollOnce, FALLBACK_POLL_MS);
    };

    const stopPolling = () => {
      if (!pollTimer) return;
      window.clearInterval(pollTimer);
      pollTimer = 0;
    };

    if (!("EventSource" in window)) {
      startPolling();
      return () => {
        closed = true;
        stopPolling();
      };
    }

    es = new EventSource("/api/event/stream");
    es.onopen = () => {
      opened = true;
      errorsBeforeOpen = 0;
      stopPolling();
    };
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as SyncMsg;
        if (msg.type === "snapshot") applySnapshot(msg.payload);
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      if (closed) return;
      // EventSource reconnects on its own. Only poll while the stream is down.
      startPolling();
      if (opened) return;
      errorsBeforeOpen += 1;
      if (errorsBeforeOpen < 3) return;
      es?.close();
      es = null;
    };

    return () => {
      closed = true;
      es?.close();
      es = null;
      stopPolling();
    };
  }, [enabled]);
}

export function snapshotToSuite(snapshot: EventSnapshot): SuiteState {
  const { revision: _r, poolSummary: _ps, poolTokens: _pt, ...suite } =
    snapshot;
  return normalizeSuiteState(suite);
}
