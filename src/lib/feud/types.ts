export type FeudAnswer = {
  id: string;
  text: string;
  points: number;
  revealed: boolean;
  awardedTo?: "left" | "right";
};

export type FeudRound = {
  id: string;
  question: string;
  strikes: number;
  answers: FeudAnswer[];
};

export type FeudTeam = {
  name: string;
  score: number;
};

import { appendUnique, claimBankId, legacyNamedPayload } from "@/lib/content-bank";

export type FeudSavedAnswer = {
  text: string;
  points: number;
};

export type FeudSavedRound = {
  question: string;
  answers: FeudSavedAnswer[];
};

export type FeudBankQuestion = FeudSavedRound & {
  id: string;
};

export type FeudGameState = {
  id: string;
  currentRoundIndex: number;
  rounds: FeudRound[];
  showHeader: boolean;
  leftTeam: FeudTeam;
  rightTeam: FeudTeam;
  showTeamScores: boolean;
  showAnswerScores: boolean;
  /** Which team receives points when an answer is revealed. */
  awardTeam: "left" | "right" | "none";
  library: FeudBankQuestion[];
};

function normalizeFeudSavedRound(raw: unknown): FeudSavedRound | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { question?: unknown; answers?: unknown };
  const question = typeof record.question === "string" ? record.question : "";
  const answers = Array.isArray(record.answers)
    ? record.answers
        .map((answer) => {
          if (!answer || typeof answer !== "object") return null;
          const entry = answer as { text?: unknown; points?: unknown };
          const text = typeof entry.text === "string" ? entry.text : "";
          const points =
            typeof entry.points === "number" && Number.isFinite(entry.points)
              ? Math.max(0, Math.round(entry.points))
              : 0;
          if (!text.trim()) return null;
          return { text, points };
        })
        .filter((answer): answer is FeudSavedAnswer => answer != null)
    : [];
  if (!question.trim() && answers.length === 0) return null;
  return { question, answers };
}

export function feudBankKey(entry: FeudSavedRound): string {
  return JSON.stringify({
    question: entry.question.trim(),
    answers: entry.answers.map((answer) => [answer.text.trim(), answer.points]),
  });
}

export function feudBankQuestionFromRound(
  round: FeudRound,
  id: string,
): FeudBankQuestion | null {
  const saved = normalizeFeudSavedRound(round);
  if (!saved) return null;
  return { id, ...saved };
}

export function mergeFeudBank(
  library: FeudBankQuestion[],
  incoming: FeudBankQuestion[],
): FeudBankQuestion[] {
  return appendUnique(library, incoming, feudBankKey);
}

export function normalizeFeudLibrary(raw: unknown): FeudBankQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: FeudBankQuestion[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const legacy = legacyNamedPayload(item);
    if (legacy && Array.isArray(legacy.payload)) {
      legacy.payload.forEach((round, roundIndex) => {
        const saved = normalizeFeudSavedRound(round);
        if (!saved) return;
        questions.push({
          id: claimBankId(
            legacy.id ? `${legacy.id}-${roundIndex}` : "",
            seen,
            `feud-${index}-${roundIndex}`,
          ),
          ...saved,
        });
      });
      return;
    }
    const saved = normalizeFeudSavedRound(item);
    if (!saved) return;
    const id =
      item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : "";
    questions.push({
      id: claimBankId(id, seen, `feud-${index}`),
      ...saved,
    });
  });
  return questions;
}

export function feudRoundsFromLibrary(
  rounds: FeudSavedRound[],
  nextId: () => string,
): FeudRound[] {
  return rounds.map((round) => ({
    id: nextId(),
    question: round.question,
    strikes: 0,
    answers: round.answers.map((answer) => ({
      id: nextId(),
      text: answer.text,
      points: answer.points,
      revealed: false,
    })),
  }));
}
