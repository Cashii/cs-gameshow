import {
  DERBY_DURATION_MS,
  DERBY_RACER_IDS,
  type DerbyRacerId,
} from "./types";

export { DERBY_DURATION_MS };

export type DerbyPositions = Record<DerbyRacerId, number>;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  if (a === 0) a = 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function zeros(): DerbyPositions {
  return {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };
}

function packAtBeat(
  t: number,
  order: DerbyRacerId[],
  rand: () => number,
): DerbyPositions {
  const pack = t * 0.84;
  const positions = zeros();
  order.forEach((id, rank) => {
    const gap = 0.03 + rand() * 0.02;
    const jitter = (rand() - 0.5) * 0.018;
    positions[id] = Math.min(0.9, Math.max(0, pack - rank * gap + jitter));
  });
  return positions;
}

const BEATS = [0, 0.12, 0.26, 0.4, 0.54, 0.68, 0.82, 0.9, 1];

type Wobble = {
  a1: number;
  f1: number;
  p1: number;
  a2: number;
  f2: number;
  p2: number;
};

/**
 * Deterministic progress curves. At t=1 the winner is at 1 and the field
 * is packed just behind. Mid-race lead changes come from seeded beats.
 */
export function createRaceSampler(
  winnerId: DerbyRacerId,
  seed: number,
): (t: number) => DerbyPositions {
  const rand = mulberry32(seed);
  const frames: { t: number; pos: DerbyPositions }[] = [];
  let prevLeader: DerbyRacerId | null = null;

  for (const beat of BEATS) {
    if (beat === 0) {
      frames.push({ t: 0, pos: zeros() });
      continue;
    }

    if (beat === 1) {
      const others = shuffle(
        DERBY_RACER_IDS.filter((id) => id !== winnerId),
        rand,
      );
      const finishes = [0.955, 0.918, 0.882];
      const pos = zeros();
      pos[winnerId] = 1;
      others.forEach((id, i) => {
        pos[id] = finishes[i]! + (rand() - 0.5) * 0.01;
      });
      frames.push({ t: 1, pos });
      continue;
    }

    let order = shuffle([...DERBY_RACER_IDS], rand);
    if (beat === 0.9) {
      const slot = rand() < 0.5 ? 1 : rand() < 0.6 ? 2 : 0;
      order = order.filter((id) => id !== winnerId);
      order.splice(slot, 0, winnerId);
    } else if (prevLeader && order[0] === prevLeader && rand() < 0.8) {
      const swapWith = 1 + Math.floor(rand() * 3);
      const lead = order[0]!;
      order[0] = order[swapWith]!;
      order[swapWith] = lead;
    }
    prevLeader = order[0] ?? null;
    frames.push({ t: beat, pos: packAtBeat(beat, order, rand) });
  }

  const wobble = Object.fromEntries(
    DERBY_RACER_IDS.map((id) => [
      id,
      {
        a1: 0.01 + rand() * 0.01,
        f1: 5 + rand() * 4,
        p1: rand() * Math.PI * 2,
        a2: 0.005 + rand() * 0.006,
        f2: 11 + rand() * 6,
        p2: rand() * Math.PI * 2,
      } satisfies Wobble,
    ]),
  ) as Record<DerbyRacerId, Wobble>;

  return (tRaw: number): DerbyPositions => {
    const t = Math.min(1, Math.max(0, tRaw));
    if (t <= 0) return zeros();

    let i = 1;
    while (i < frames.length && frames[i]!.t < t) i += 1;
    const next = frames[i]!;
    const prev = frames[i - 1]!;
    const span = next.t - prev.t || 1;
    const local = smootherstep((t - prev.t) / span);
    const damp = 1 - smootherstep((t - 0.88) / 0.12);

    const out = zeros();
    for (const id of DERBY_RACER_IDS) {
      let p = lerp(prev.pos[id], next.pos[id], local);
      const w = wobble[id];
      p +=
        damp *
        (w.a1 * Math.sin(t * w.f1 * Math.PI * 2 + w.p1) +
          w.a2 * Math.sin(t * w.f2 * Math.PI * 2 + w.p2));
      out[id] = Math.min(t >= 1 ? 1 : 0.97, Math.max(0, p));
    }

    if (t >= 1) {
      out[winnerId] = 1;
      for (const id of DERBY_RACER_IDS) {
        if (id !== winnerId) out[id] = Math.min(out[id], 0.97);
      }
    }

    return out;
  };
}

export function raceProgress(
  startedAt: number | null,
  durationMs: number,
  now: number,
): number {
  if (startedAt == null) return 0;
  const duration = durationMs > 0 ? durationMs : DERBY_DURATION_MS;
  return Math.min(1, Math.max(0, (now - startedAt) / duration));
}
