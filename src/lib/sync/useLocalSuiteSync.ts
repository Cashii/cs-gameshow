"use client";

import { useEffect } from "react";
import {
  SUITE_STORAGE_KEY,
  SUITE_SYNC_CHANNEL,
  loadSuiteState,
  normalizeSuiteState,
  saveSuiteState,
  type SuiteState,
} from "@/lib/suite-state";

type LocalSuiteMsg = {
  type: "suite";
  suite: SuiteState;
};

function isSuiteMsg(data: unknown): data is LocalSuiteMsg {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as LocalSuiteMsg).type === "suite" &&
    typeof (data as LocalSuiteMsg).suite === "object"
  );
}

let publishChannel: BroadcastChannel | null = null;

function getPublishChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  try {
    publishChannel ??= new BroadcastChannel(SUITE_SYNC_CHANNEL);
    return publishChannel;
  } catch {
    return null;
  }
}

export function publishLocalSuite(suite: SuiteState): void {
  saveSuiteState(suite);
  const channel = getPublishChannel();
  try {
    channel?.postMessage({ type: "suite", suite } satisfies LocalSuiteMsg);
  } catch {
    // ignore
  }
}

/** Apply the last operator suite saved in this browser (other windows). */
export function readLocalSuite(): SuiteState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUITE_STORAGE_KEY);
    if (!raw) return null;
    return loadSuiteState();
  } catch {
    return null;
  }
}

export function useLocalSuiteSync(
  onSuite: (suite: SuiteState) => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SUITE_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (!isSuiteMsg(event.data)) return;
        onSuite(normalizeSuiteState(event.data.suite));
      };
    } catch {
      channel = null;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SUITE_STORAGE_KEY || !event.newValue) return;
      try {
        onSuite(
          normalizeSuiteState(JSON.parse(event.newValue) as SuiteState),
        );
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled, onSuite]);
}
