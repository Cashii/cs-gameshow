export type MessageBoardState = {
  text: string;
};

export function createDefaultMessageBoardState(): MessageBoardState {
  return { text: "" };
}
