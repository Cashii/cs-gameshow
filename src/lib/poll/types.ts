export type PollChoice = {
  id: string;
  text: string;
  votes: number;
};

export type PollState = {
  id: string;
  question: string;
  choices: PollChoice[];
  status: "idle" | "open" | "closed" | "results";
};

export function createDefaultPollState(): PollState {
  return {
    id: "",
    question: "",
    choices: [
      { id: "a", text: "Option A", votes: 0 },
      { id: "b", text: "Option B", votes: 0 },
    ],
    status: "idle",
  };
}

export function createEmptyPoll(): PollState {
  return createDefaultPollState();
}
