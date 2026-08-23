export type PollChoice = {
  id: string;
  text: string;
  votes: number;
};

export type PollVoteLogEntry = {
  id: string;
  at: string;
  choiceId: string;
  choiceText: string;
  voterLabel: string;
  deviceCode: string;
  platform: string;
};

export type PollState = {
  id: string;
  question: string;
  choices: PollChoice[];
  status: "idle" | "open" | "closed" | "results";
  voteLog: PollVoteLogEntry[];
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
    voteLog: [],
  };
}

export function createEmptyPoll(): PollState {
  return createDefaultPollState();
}

