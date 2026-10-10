export type PriceWheelPlayer = {
  id: string;
  name: string;
  score: number;
};

export type PriceWheelState = {
  players: PriceWheelPlayer[];
};

export function clampPriceWheelScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(-999999, Math.min(999999, Math.round(value)));
}

export function createDefaultPriceWheelState(): PriceWheelState {
  return { players: [] };
}

export function normalizePriceWheelPlayers(raw: unknown): PriceWheelPlayer[] {
  if (!Array.isArray(raw)) return [];
  const players: PriceWheelPlayer[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; name?: unknown; score?: unknown };
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    players.push({
      id,
      name: typeof record.name === "string" ? record.name.slice(0, 40) : "",
      score: clampPriceWheelScore(record.score),
    });
  }
  return players;
}

export function normalizePriceWheelState(
  raw: Partial<PriceWheelState> | undefined,
): PriceWheelState {
  const defaults = createDefaultPriceWheelState();
  if (!raw || typeof raw !== "object") return defaults;
  return {
    players: normalizePriceWheelPlayers(raw.players),
  };
}

export function priceWheelColumns(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}
