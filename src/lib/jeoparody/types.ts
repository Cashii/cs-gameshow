export type JeoparodyPhase = "board" | "clue" | "answer";

export type JeoparodyClue = {
  id: string;
  value: number;
  prompt: string;
  response: string;
  played: boolean;
};

export type JeoparodyCategory = {
  id: string;
  name: string;
  clues: JeoparodyClue[];
};

export type JeoparodyContestant = {
  id: string;
  name: string;
  score: number;
};

export type JeoparodyGameState = {
  categories: JeoparodyCategory[];
  contestants: JeoparodyContestant[];
  selectedClueId: string | null;
  phase: JeoparodyPhase;
  showScores: boolean;
};

export function findClue(
  state: JeoparodyGameState,
  clueId: string | null,
): { category: JeoparodyCategory; clue: JeoparodyClue } | null {
  if (!clueId) return null;
  for (const category of state.categories) {
    const clue = category.clues.find((c) => c.id === clueId);
    if (clue) return { category, clue };
  }
  return null;
}

export function mapClue(
  state: JeoparodyGameState,
  clueId: string,
  updater: (clue: JeoparodyClue) => JeoparodyClue,
): JeoparodyGameState {
  return {
    ...state,
    categories: state.categories.map((category) => ({
      ...category,
      clues: category.clues.map((clue) =>
        clue.id === clueId ? updater(clue) : clue,
      ),
    })),
  };
}
