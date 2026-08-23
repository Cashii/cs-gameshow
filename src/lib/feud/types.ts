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
  awardTeam: "left" | "right";
};
