export type WheelGameState = {
  phrase: string;
  revealedLetters: string[];
  revealedAll: boolean;
  zoom: number;
  showLetterLegend: boolean;
};

export function createDefaultWheelState(): WheelGameState {
  return {
    phrase: "",
    revealedLetters: [],
    revealedAll: false,
    zoom: 1,
    showLetterLegend: true,
  };
}
