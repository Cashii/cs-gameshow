export type WheelBankPuzzle = {
  id: string;
  topic: string;
  phrase: string;
};

export type WheelGameState = {
  phrase: string;
  topic: string;
  revealedLetters: string[];
  revealedAll: boolean;
  zoom: number;
  showLetterLegend: boolean;
  wrongCount: number;
  /** Saved topics/phrases you can load onto the board anytime. */
  bank: WheelBankPuzzle[];
  /** Bank item currently on the board, if loaded from the bank. */
  activeBankId: string | null;
};

export function createWheelBankPuzzle(
  partial?: Partial<WheelBankPuzzle>,
): WheelBankPuzzle {
  return {
    id: partial?.id || Math.random().toString(36).slice(2, 10),
    topic: typeof partial?.topic === "string" ? partial.topic : "",
    phrase: typeof partial?.phrase === "string" ? partial.phrase : "",
  };
}

export function normalizeWheelBankPuzzle(
  raw: unknown,
  index = 0,
): WheelBankPuzzle | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<WheelBankPuzzle> & {
    finishedAt?: unknown;
  };
  const phrase = typeof item.phrase === "string" ? item.phrase : "";
  // History entries required a phrase; keep empty bank drafts editable.
  if ("finishedAt" in item && !phrase.trim()) return null;
  return createWheelBankPuzzle({
    id:
      typeof item.id === "string" && item.id
        ? item.id
        : `bank-${index}-${Date.now()}`,
    topic: typeof item.topic === "string" ? item.topic : "",
    phrase,
  });
}

function dedupeBank(items: WheelBankPuzzle[]): WheelBankPuzzle[] {
  const seen = new Set<string>();
  const out: WheelBankPuzzle[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Prefer `bank`; migrate legacy `queue` + `history` when bank is missing. */
export function normalizeWheelBank(rawWheel: unknown): WheelBankPuzzle[] {
  if (!rawWheel || typeof rawWheel !== "object") return [];
  const wheel = rawWheel as {
    bank?: unknown;
    queue?: unknown;
    history?: unknown;
  };

  if (Array.isArray(wheel.bank)) {
    return dedupeBank(
      wheel.bank
        .map((item, index) => normalizeWheelBankPuzzle(item, index))
        .filter((item): item is WheelBankPuzzle => item != null),
    );
  }

  const fromQueue = Array.isArray(wheel.queue)
    ? wheel.queue
        .map((item, index) => normalizeWheelBankPuzzle(item, index))
        .filter((item): item is WheelBankPuzzle => item != null)
    : [];
  const fromHistory = Array.isArray(wheel.history)
    ? wheel.history
        .map((item, index) =>
          normalizeWheelBankPuzzle(item, fromQueue.length + index),
        )
        .filter((item): item is WheelBankPuzzle => item != null)
    : [];

  return dedupeBank([...fromQueue, ...fromHistory]);
}

/** Copy a bank puzzle onto the live board. Returns null if phrase is blank. */
export function loadWheelBankPuzzle(
  state: WheelGameState,
  bankId: string,
): WheelGameState | null {
  const item = (state.bank ?? []).find((entry) => entry.id === bankId);
  if (!item?.phrase.trim()) return null;
  return {
    ...state,
    phrase: item.phrase.trim(),
    topic: item.topic.trim(),
    revealedLetters: [],
    revealedAll: false,
    wrongCount: 0,
    activeBankId: item.id,
  };
}

export function createDefaultWheelState(): WheelGameState {
  return {
    phrase: "",
    topic: "",
    revealedLetters: [],
    revealedAll: false,
    zoom: 1,
    showLetterLegend: true,
    wrongCount: 0,
    bank: [],
    activeBankId: null,
  };
}

export function phraseHasLetter(phrase: string, letter: string): boolean {
  return phrase.toUpperCase().includes(letter.toUpperCase());
}
