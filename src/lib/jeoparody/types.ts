import { appendUnique, claimBankId, legacyNamedPayload } from "@/lib/content-bank";

export type JeoparodyPhase = "board" | "clue" | "answer";

export type JeoparodySavedClue = {
  value: number;
  prompt: string;
  response: string;
};

export type JeoparodySavedCategory = {
  name: string;
  clues: JeoparodySavedClue[];
};

export type JeoparodyBankCategory = JeoparodySavedCategory & {
  id: string;
};

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
  library: JeoparodyBankCategory[];
};

export function jeoparodyBankKey(category: JeoparodySavedCategory): string {
  return JSON.stringify({
    name: category.name.trim(),
    clues: category.clues.map((clue) => [
      clue.value,
      clue.prompt.trim(),
      clue.response.trim(),
    ]),
  });
}

export function mergeJeoparodyBank(
  library: JeoparodyBankCategory[],
  incoming: JeoparodyBankCategory[],
): JeoparodyBankCategory[] {
  return appendUnique(library, incoming, jeoparodyBankKey);
}

export function jeoparodyCategoryHasContent(
  category: JeoparodySavedCategory,
): boolean {
  if (category.name.trim()) return true;
  return category.clues.some(
    (clue) => clue.prompt.trim() || clue.response.trim(),
  );
}

function readJeoparodyCategory(raw: unknown): JeoparodySavedCategory | null {
  if (!raw || typeof raw !== "object") return null;
  const category = raw as { name?: unknown; clues?: unknown };
  const clues = Array.isArray(category.clues)
    ? category.clues
        .filter((clue) => clue && typeof clue === "object")
        .map((clue) => {
          const entry = clue as {
            value?: unknown;
            prompt?: unknown;
            response?: unknown;
          };
          return {
            value:
              typeof entry.value === "number" && Number.isFinite(entry.value)
                ? entry.value
                : 0,
            prompt: typeof entry.prompt === "string" ? entry.prompt : "",
            response: typeof entry.response === "string" ? entry.response : "",
          };
        })
    : [];
  const saved = {
    name: typeof category.name === "string" ? category.name : "",
    clues,
  };
  return jeoparodyCategoryHasContent(saved) ? saved : null;
}

export function normalizeJeoparodyLibrary(
  raw: unknown,
): JeoparodyBankCategory[] {
  if (!Array.isArray(raw)) return [];
  const categories: JeoparodyBankCategory[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const legacy = legacyNamedPayload(item);
    if (legacy && Array.isArray(legacy.payload)) {
      legacy.payload.forEach((category, categoryIndex) => {
        const saved = readJeoparodyCategory(category);
        if (!saved) return;
        categories.push({
          id: claimBankId(
            legacy.id ? `${legacy.id}-${categoryIndex}` : "",
            seen,
            `category-${index}-${categoryIndex}`,
          ),
          ...saved,
        });
      });
      return;
    }
    const saved = readJeoparodyCategory(item);
    if (!saved) return;
    const id =
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : "";
    categories.push({
      id: claimBankId(id, seen, `category-${index}`),
      ...saved,
    });
  });
  return categories;
}

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
