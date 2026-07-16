export type DrawGameState = {
  number: string | null;
  sequence: number;
};

export function createDefaultDrawState(): DrawGameState {
  return {
    number: null,
    sequence: 0,
  };
}
