export type MessageBoardState = {
  text: string;
  scale: number;
};

export const DEFAULT_MESSAGE_BOARD_SCALE = 1;
export const MIN_MESSAGE_BOARD_SCALE = 0.5;
export const MAX_MESSAGE_BOARD_SCALE = 2.5;
export const MESSAGE_BOARD_SCALE_STEP = 0.1;

export function clampMessageBoardScale(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_MESSAGE_BOARD_SCALE;
  return Math.min(
    MAX_MESSAGE_BOARD_SCALE,
    Math.max(MIN_MESSAGE_BOARD_SCALE, Math.round(n * 10) / 10),
  );
}

export function createDefaultMessageBoardState(): MessageBoardState {
  return { text: "", scale: DEFAULT_MESSAGE_BOARD_SCALE };
}
