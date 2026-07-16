export type FeudAnswer = {
  id: string;
  text: string;
  points: number;
  revealed: boolean;
};

export type FeudRound = {
  id: string;
  question: string;
  strikes: number;
  answers: FeudAnswer[];
};

export type FeudGameState = {
  id: string;
  currentRoundIndex: number;
  rounds: FeudRound[];
  showHeader: boolean;
};
