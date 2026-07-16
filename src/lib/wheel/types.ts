export type WheelGameState = {
  phrase: string;
  revealedLetters: string[];
  revealedAll: boolean;
  zoom: number;
};

export function createDefaultWheelState(): WheelGameState {
  return {
    phrase: "",
    revealedLetters: [],
    revealedAll: false,
    zoom: 1,
  };
}
