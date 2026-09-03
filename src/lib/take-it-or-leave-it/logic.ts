import type { TakeItCard, TakeItCase, TakeItGameState } from "./types";

export function shuffleCardsIntoCases(cards: TakeItCard[]): TakeItCase[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled.map((card, index) => ({
    id: index + 1,
    card,
    opened: false,
  }));
}

export function cardsToCases(cards: TakeItCard[]): TakeItCase[] {
  return cards.map((card, index) => ({
    id: index + 1,
    card,
    opened: false,
  }));
}

export function getUnopenedCases(game: TakeItGameState): TakeItCase[] {
  return (game.cases ?? []).filter((c) => !c.opened);
}

export function countUnopened(game: TakeItGameState): number {
  return getUnopenedCases(game).length;
}

export function countCards(
  cards: readonly TakeItCard[],
): { green: number; red: number } {
  let green = 0;
  let red = 0;
  for (const card of cards) {
    if (card === "green") green += 1;
    else red += 1;
  }
  return { green, red };
}
