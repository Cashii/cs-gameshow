import type { LiveDrawerToken, PoolSummary } from "@/lib/live-drawer/types";
import { getLiveDrawerColor } from "@/lib/live-drawer/types";

export type ColorDrawRequest = {
  colorId: string;
  count: number;
};

export function poolTokenCount(poolSummary: PoolSummary): number {
  return Object.values(poolSummary).reduce((sum, count) => sum + count, 0);
}

export function validateColorDrawRequests(
  requests: ColorDrawRequest[],
  poolSummary: PoolSummary,
  anyCount = 0,
): string | null {
  let total = 0;
  for (const { colorId, count } of requests) {
    if (count <= 0) continue;
    total += count;
    const available = poolSummary[colorId] ?? 0;
    const name = getLiveDrawerColor(colorId)?.name ?? colorId;
    if (available === 0) {
      return `No ${name} tokens in the pool`;
    }
    if (count > available) {
      return `Only ${available} ${name} token${available === 1 ? "" : "s"} in the pool`;
    }
  }
  const any = Math.max(0, anyCount);
  if (total + any === 0) return "Set at least one color count";
  const left = poolTokenCount(poolSummary) - total;
  if (any > left) {
    if (left <= 0) return "No tokens left in the pool";
    return `Only ${left} token${left === 1 ? "" : "s"} left in the pool`;
  }
  return null;
}

export function clampColorCount(
  colorId: string,
  requested: number,
  poolSummary: PoolSummary,
): number {
  const available = poolSummary[colorId] ?? 0;
  return Math.min(Math.max(0, requested), available);
}

export function sampleTokensByColor(
  pool: LiveDrawerToken[],
  requests: ColorDrawRequest[],
): LiveDrawerToken[] {
  const drawn: LiveDrawerToken[] = [];
  const usedIds = new Set<string>();

  for (const { colorId, count } of requests) {
    if (count <= 0) continue;
    const available = pool.filter(
      (t) => t.colorId === colorId && !usedIds.has(t.id),
    );
    if (available.length < count) {
      throw new Error(
        `Not enough ${colorId} tokens in pool (need ${count}, have ${available.length})`,
      );
    }
    const shuffled = shuffle(available);
    for (let i = 0; i < count; i++) {
      drawn.push(shuffled[i]!);
      usedIds.add(shuffled[i]!.id);
    }
  }
  return drawn;
}

export function sampleDrawTokens(
  pool: LiveDrawerToken[],
  requests: ColorDrawRequest[],
  anyCount = 0,
): LiveDrawerToken[] {
  const drawn = sampleTokensByColor(pool, requests);
  const any = Math.max(0, anyCount);
  if (any === 0) return drawn;

  const usedIds = new Set(drawn.map((token) => token.id));
  const remaining = pool.filter((token) => !usedIds.has(token.id));
  if (remaining.length < any) {
    throw new Error(
      `Only ${remaining.length} token${remaining.length === 1 ? "" : "s"} left in the pool`,
    );
  }
  const shuffled = shuffle(remaining);
  for (let i = 0; i < any; i++) drawn.push(shuffled[i]!);
  return drawn;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function normalizeTokenNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return String(Number(trimmed));
}

export function parseNumberRange(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const nums: string[] = [];

  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start > end ||
        end - start > 10000
      ) {
        return [];
      }
      for (let i = start; i <= end; i++) nums.push(String(i));
      continue;
    }
    const normalized = normalizeTokenNumber(part);
    if (!normalized) return [];
    nums.push(normalized);
  }

  return nums;
}
