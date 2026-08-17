import { uid } from "@/lib/utils";
import type { FeudGameState } from "./types";

export function createSampleFeudGame(): FeudGameState {
  return {
    id: uid(),
    currentRoundIndex: 0,
    showHeader: true,
    leftTeam: { name: "Left", score: 0 },
    rightTeam: { name: "Right", score: 0 },
    showTeamScores: true,
    showAnswerScores: true,
    rounds: [
      {
        id: uid(),
        question: "Name a fruit that keeps the doctor away",
        strikes: 0,
        answers: [
          { id: uid(), text: "Apple", points: 30, revealed: false },
          { id: uid(), text: "Banana", points: 18, revealed: false },
          { id: uid(), text: "Orange", points: 15, revealed: false },
          { id: uid(), text: "Grapes", points: 12, revealed: false },
          { id: uid(), text: "Pear", points: 9, revealed: false },
          { id: uid(), text: "Peach", points: 8, revealed: false },
          { id: uid(), text: "Plum", points: 5, revealed: false },
          { id: uid(), text: "Kiwi", points: 3, revealed: false },
        ],
      },
    ],
  };
}
