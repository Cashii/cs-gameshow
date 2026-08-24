export type WheelGameState = {
  phrase: string;
  topic: string;
  revealedLetters: string[];
  revealedAll: boolean;
  zoom: number;
  showLetterLegend: boolean;
};

export function createDefaultWheelState(): WheelGameState {
  return {
    phrase: "",
    topic: "",
    revealedLetters: [],
    revealedAll: false,
    zoom: 1,
    showLetterLegend: true,
  };
}
