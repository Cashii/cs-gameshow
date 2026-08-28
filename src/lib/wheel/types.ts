export type WheelGameState = {
  phrase: string;
  topic: string;
  revealedLetters: string[];
  revealedAll: boolean;
  zoom: number;
  showLetterLegend: boolean;
  wrongCount: number;
};

export function createDefaultWheelState(): WheelGameState {
  return {
    phrase: "",
    topic: "",
    revealedLetters: [],
    revealedAll: false,
    zoom: 1,
    showLetterLegend: true,
    wrongCount: 0,
  };
}

export function phraseHasLetter(phrase: string, letter: string): boolean {
  return phrase.toUpperCase().includes(letter.toUpperCase());
}
