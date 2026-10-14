const DERBY_CLOCK_CHANNEL = "cs_gameshow_derby_clock";

export type DerbyClockTick = {
  type: "derby-clock";
  startedAt: number;
  durationMs: number;
};

function isClockTick(data: unknown): data is DerbyClockTick {
  if (typeof data !== "object" || data === null) return false;
  const tick = data as DerbyClockTick;
  return (
    tick.type === "derby-clock" &&
    typeof tick.startedAt === "number" &&
    typeof tick.durationMs === "number"
  );
}

let publishChannel: BroadcastChannel | null = null;

function getPublishChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  try {
    publishChannel ??= new BroadcastChannel(DERBY_CLOCK_CHANNEL);
    return publishChannel;
  } catch {
    return null;
  }
}

/** Operator window is the one that stays awake. Tell the spectator where the race is. */
export function publishDerbyClock(startedAt: number, durationMs: number): void {
  try {
    getPublishChannel()?.postMessage({
      type: "derby-clock",
      startedAt,
      durationMs,
    } satisfies DerbyClockTick);
  } catch {
    // ignore
  }
}

export function subscribeDerbyClock(
  onTick: (tick: DerbyClockTick) => void,
): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(DERBY_CLOCK_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!isClockTick(event.data)) return;
      onTick(event.data);
    };
  } catch {
    channel = null;
  }
  return () => channel?.close();
}
