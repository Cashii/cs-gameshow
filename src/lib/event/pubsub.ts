import type { EventSnapshot } from "@/lib/suite-state";

type Listener = (snapshot: EventSnapshot) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishSnapshot(snapshot: EventSnapshot): void {
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // ignore listener errors
    }
  }
}

/** @deprecated Use publishSnapshot. Kept so stale Turbopack graphs still compile. */
export function publishRevision(snapshot: EventSnapshot): void {
  publishSnapshot(snapshot);
}
