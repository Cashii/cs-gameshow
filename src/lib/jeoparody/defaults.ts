import { uid } from "@/lib/utils";
import type {
  JeoparodyCategory,
  JeoparodyClue,
  JeoparodyContestant,
  JeoparodyGameState,
} from "./types";

export const DEFAULT_CLUE_VALUES = [200, 400, 600, 800, 1000] as const;

const SAMPLE_BOARD: { name: string; clues: [string, string][] }[] = [
  {
    name: "Office Life",
    clues: [
      ["This beverage fuels most Monday standups.", "What is coffee?"],
      ["The room where meetings go to die, often with a TV that never works.", "What is a conference room?"],
      ["You send this when you meant to reply-all but thought better of it.", "What is a private message?"],
      ["The unofficial 3pm ritual involving a microwave.", "What is a snack break?"],
      ["The shared document nobody updates but everyone cites.", "What is the wiki?"],
    ],
  },
  {
    name: "Tech Talk",
    clues: [
      ["Ctrl+Z is this programmer's best friend.", "What is undo?"],
      ["This three-letter protocol moves most of the web.", "What is HTTP?"],
      ["A merge that rewrites history instead of adding a commit.", "What is rebase?"],
      ["The ticket status that means it is someone else's problem now.", "What is blocked?"],
      ["This animal names a popular container runtime.", "What is Docker?"],
    ],
  },
  {
    name: "Pop Culture",
    clues: [
      ["May the Force be with this 1977 space opera.", "What is Star Wars?"],
      ["This streaming service is known for canceling shows after two seasons.", "What is Netflix?"],
      ["The yellow sponge who lives in a pineapple.", "Who is SpongeBob?"],
      ["This British wizard's scar is shaped like a lightning bolt.", "Who is Harry Potter?"],
      ["The superhero whose identity is Clark Kent.", "Who is Superman?"],
    ],
  },
  {
    name: "World Facts",
    clues: [
      ["This is the largest ocean on Earth.", "What is the Pacific?"],
      ["Paris is the capital of this country.", "What is France?"],
      ["This river is the longest in Africa.", "What is the Nile?"],
      ["Mount Everest sits on the border of Nepal and this country.", "What is China?"],
      ["This is the smallest country by area.", "What is Vatican City?"],
    ],
  },
  {
    name: "Word Play",
    clues: [
      ["A palindrome for a midday meal.", "What is noon?"],
      ["Anagram of listen that means quiet.", "What is silent?"],
      ["The punctuation that introduces a list.", "What is a colon?"],
      ["A word that reads the same upside down on a calculator: 0.7734.", "What is hello?"],
      ["This is the only number with its letters in alphabetical order.", "What is forty?"],
    ],
  },
  {
    name: "Sports",
    clues: [
      ["There are this many players on a basketball court per team.", "What is five?"],
      ["The FIFA World Cup is played every this many years.", "What is four?"],
      ["This sport uses a shuttlecock.", "What is badminton?"],
      ["A hat trick is three of these in one game.", "What are goals?"],
      ["Wimbledon is played on this surface.", "What is grass?"],
    ],
  },
];

export function createEmptyClue(value: number): JeoparodyClue {
  return {
    id: uid(),
    value,
    prompt: "",
    response: "",
    played: false,
  };
}

export function createEmptyCategory(
  name = "Category",
  values: readonly number[] = DEFAULT_CLUE_VALUES,
): JeoparodyCategory {
  return {
    id: uid(),
    name,
    clues: values.map((value) => createEmptyClue(value)),
  };
}

export function createEmptyContestant(name: string): JeoparodyContestant {
  return { id: uid(), name, score: 0 };
}

export function createSampleJeoparodyGame(): JeoparodyGameState {
  return {
    categories: SAMPLE_BOARD.map((column) => ({
      id: uid(),
      name: column.name,
      clues: column.clues.map(([prompt, response], index) => ({
        id: uid(),
        value: DEFAULT_CLUE_VALUES[index] ?? (index + 1) * 200,
        prompt,
        response,
        played: false,
      })),
    })),
    contestants: [
      createEmptyContestant("Player 1"),
      createEmptyContestant("Player 2"),
      createEmptyContestant("Player 3"),
    ],
    selectedClueId: null,
    phase: "board",
    showScores: true,
  };
}
