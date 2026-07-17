import type { TakeItCase, TakeItGameState } from "./types";

export function shuffleValuesIntoCases(values: number[]): TakeItCase[] {
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled.map((value, index) => ({
    id: index + 1,
    value,
    opened: false,
  }));
}

export function getUnopenedCases(game: TakeItGameState): TakeItCase[] {
  return (game.cases ?? []).filter((c) => !c.opened);
}

export function getRemainingValues(game: TakeItGameState): number[] {
  return getUnopenedCases(game)
    .map((c) => c.value)
    .sort((a, b) => a - b);
}

export function getSuggestedOffer(game: TakeItGameState): number {
  const remaining = getRemainingValues(game);
  if (remaining.length === 0) return 0;
  const avg =
    remaining.reduce((sum, value) => sum + value, 0) / remaining.length;
  return Math.round(avg);
}

export function formatTakeItMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getPlayerCase(game: TakeItGameState): TakeItCase | null {
  if (game.playerCaseId == null) return null;
  return (game.cases ?? []).find((c) => c.id === game.playerCaseId) ?? null;
}

export function countUnopenedNonPlayer(game: TakeItGameState): number {
  return (game.cases ?? []).filter(
    (c) => !c.opened && c.id !== game.playerCaseId,
  ).length;
}

export function shouldAutoReveal(game: TakeItGameState): boolean {
  return (
    game.phase === "playing" &&
    game.playerCaseId != null &&
    countUnopenedNonPlayer(game) === 0
  );
}
