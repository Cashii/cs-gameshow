import {
  DERBY_DURATION_MS,
  DERBY_RACER_IDS,
  type DerbyRacerId,
} from "./types";

export { DERBY_DURATION_MS };

export type DerbyPositions = Record<DerbyRacerId, number>;

export type DerbyFrame = {
  positions: DerbyPositions;
  speeds: DerbyPositions;
};

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

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const STEPS = 300;
const SURGE_START = 0.84;

type BoostWindow = {
  start: number;
  end: number;
  leader: DerbyRacerId;
};

function leaderAt(windows: BoostWindow[], t: number): DerbyRacerId | null {
  for (const window of windows) {
    if (t >= window.start && t < window.end) return window.leader;
  }
  return null;
}

function previousLeader(windows: BoostWindow[], t: number): DerbyRacerId | null {
  for (let i = 0; i < windows.length; i += 1) {
    const window = windows[i]!;
    if (t >= window.start && t < window.end) {
      return i === 0 ? null : windows[i - 1]!.leader;
    }
  }
  return null;
}

function sampleTable(table: DerbyPositions[], t: number): DerbyPositions {
  const scaled = t * STEPS;
  const i = Math.min(STEPS - 1, Math.max(0, Math.floor(scaled)));
  const frac = scaled - i;
  const a = table[i]!;
  const b = table[i + 1] ?? a;
  const out = zeros();
  for (const id of DERBY_RACER_IDS) {
    out[id] = lerp(a[id], b[id], frac);
  }
  return out;
}

/**
 * Speeds stay positive so cars never reverse. Overtakes happen when one
 * car surges and the others keep rolling forward at a slower clip.
 */
export function createRaceSampler(
  winnerId: DerbyRacerId,
  seed: number,
): (t: number) => DerbyFrame {
  const rand = mulberry32(seed);
  const others = shuffle(
    DERBY_RACER_IDS.filter((id) => id !== winnerId),
    rand,
  );

  const windows: BoostWindow[] = [];
  let prev: DerbyRacerId | null = null;
  const cuts = [0, 0.09, 0.2, 0.34, 0.48, 0.62, 0.74, SURGE_START];
  for (let i = 0; i < cuts.length - 1; i += 1) {
    let pool = shuffle([...DERBY_RACER_IDS], rand);
    if (prev && pool.length > 1) {
      pool = pool.filter((id) => id !== prev);
    }
    const leader = pool[0] ?? winnerId;
    windows.push({ start: cuts[i]!, end: cuts[i + 1]!, leader });
    prev = leader;
  }

  const cruise = zeros();
  const pulseAmp = zeros();
  const pulseFreq = zeros();
  const pulsePhase = zeros();
  for (const id of DERBY_RACER_IDS) {
    cruise[id] = 0.46 + rand() * 0.08;
    pulseAmp[id] = 0.03 + rand() * 0.025;
    pulseFreq[id] = 1.6 + rand() * 1.4;
    pulsePhase[id] = rand() * Math.PI * 2;
  }

  const speedAt = (id: DerbyRacerId, t: number): number => {
    const pulse =
      0.5 +
      0.5 * Math.sin(t * pulseFreq[id] * Math.PI * 2 + pulsePhase[id]);
    let speed = cruise[id] + pulseAmp[id] * pulse;

    if (t < 0.07) speed += 0.5;

    if (t < SURGE_START) {
      const leader = leaderAt(windows, t);
      const passed = previousLeader(windows, t);
      if (id === leader) speed = 1.22;
      else if (id === passed) speed *= 0.58;
      else speed *= 0.76;
    } else {
      speed = id === winnerId ? 1.62 : 0.34 + 0.1 * pulse;
    }

    if (id === winnerId) speed = Math.max(speed, 0.52);
    return Math.max(0.24, speed);
  };

  const posTable: DerbyPositions[] = [zeros()];
  const speedTable: DerbyPositions[] = [zeros()];
  const acc = zeros();
  const dt = 1 / STEPS;

  for (let i = 1; i <= STEPS; i += 1) {
    const t = i / STEPS;
    const speeds = zeros();
    for (const id of DERBY_RACER_IDS) {
      speeds[id] = speedAt(id, t);
      acc[id] += speeds[id] * dt;
    }
    posTable.push({ ...acc });
    speedTable.push(speeds);
  }

  const surgeIndex = Math.round(SURGE_START * STEPS);
  const atSurge = posTable[surgeIndex]!;
  const packLead = Math.max(...DERBY_RACER_IDS.map((id) => atSurge[id]));
  const scale = packLead > 0 ? 0.8 / packLead : 1;
  for (const row of posTable) {
    for (const id of DERBY_RACER_IDS) {
      row[id] *= scale;
    }
  }

  const scaledSurge = posTable[surgeIndex]!;
  const finish = zeros();
  finish[winnerId] = 1;
  others.forEach((id, i) => {
    const packed = 0.955 - i * 0.028;
    finish[id] = Math.max(scaledSurge[id] + 0.04, packed);
    finish[id] = Math.min(0.968, finish[id]);
  });

  return (tRaw: number): DerbyFrame => {
    const t = Math.min(1, Math.max(0, tRaw));
    if (t <= 0) {
      return { positions: zeros(), speeds: zeros() };
    }

    const rawSpeed = sampleTable(speedTable, t);
    const positions = zeros();
    const speeds = zeros();

    if (t < SURGE_START) {
      const integrated = sampleTable(posTable, t);
      for (const id of DERBY_RACER_IDS) {
        positions[id] = integrated[id];
        speeds[id] = clamp01(rawSpeed[id] / 1.62);
      }
    } else {
      const blend = smootherstep((t - SURGE_START) / (1 - SURGE_START));
      for (const id of DERBY_RACER_IDS) {
        positions[id] = lerp(scaledSurge[id], finish[id], blend);
        speeds[id] =
          t >= 1 ? 0 : clamp01((finish[id] - scaledSurge[id]) / 0.16 / 1.2);
      }
      if (t >= 1) {
        positions[winnerId] = 1;
        for (const id of DERBY_RACER_IDS) {
          if (id !== winnerId) positions[id] = Math.min(positions[id], 0.97);
        }
      }
    }

    return { positions, speeds };
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
