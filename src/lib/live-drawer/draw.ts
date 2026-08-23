import type { LiveDrawerToken, PoolSummary } from "@/lib/live-drawer/types";
import { getLiveDrawerColor } from "@/lib/live-drawer/types";

export type ColorDrawRequest = {
  colorId: string;
  count: number;
};

export function validateColorDrawRequests(
  requests: ColorDrawRequest[],
  poolSummary: PoolSummary,
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
  if (total === 0) return "Set at least one color count";
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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function parseNumberRange(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  if (trimmed.includes("-")) {
    const [startStr, endStr] = trimmed.split("-").map((s) => s.trim());
    const start = Number(startStr);
    const end = Number(endStr);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start > end ||
      end - start > 10000
    ) {
      return [];
    }
    const nums: string[] = [];
    for (let i = start; i <= end; i++) nums.push(String(i));
    return nums;
  }

  return trimmed
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
