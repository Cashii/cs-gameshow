"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useSuite } from "@/lib/suite-provider";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function WheelHostPanel() {
  const { state, updateWheel } = useSuite();
  const wheel = state.wheel;
  const [phraseInput, setPhraseInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSetPhrase = () => {
    if (!phraseInput.trim()) return;
    updateWheel(() => ({
      phrase: phraseInput.trim(),
      revealedLetters: [],
      revealedAll: false,
      zoom: wheel.zoom || 1,
    }));
    setPhraseInput("");
    setDialogOpen(false);
  };

  const handleRevealLetter = (letter: string) => {
    if (wheel.revealedLetters.includes(letter) || wheel.revealedAll) return;
    updateWheel((prev) => ({
      ...prev,
      revealedLetters: [...prev.revealedLetters, letter],
    }));
  };

  const isLetterRevealed = (letter: string) =>
    wheel.revealedLetters.includes(letter) || wheel.revealedAll;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">Current Phrase</p>
            <p className="text-lg font-semibold text-white">
              {wheel.phrase || "No phrase set"}
            </p>
            {wheel.phrase && (
              <p className="mt-1 text-xs text-neutral-400">
                {wheel.phrase.length} characters
              </p>
            )}
          </div>
          <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
              >
                {wheel.phrase ? "Change Phrase" : "Set Phrase"}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/70" />
              <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-xl">
                <Dialog.Title className="mb-4 text-xl font-bold text-white">
                  Set Phrase
                </Dialog.Title>
                <Dialog.Description className="mb-4 text-sm text-neutral-300">
                  Enter the phrase for the game board. Letters will be revealed
                  as guessed.
                </Dialog.Description>
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSetPhrase();
                  }}
                  placeholder="Enter phrase here..."
                  className="mb-4 w-full rounded-md border border-neutral-600 bg-neutral-700 px-4 py-2 text-white placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md px-4 py-2 text-neutral-300 hover:bg-neutral-700"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={handleSetPhrase}
                    className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                  >
                    Set Phrase
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-white">Letter Controls</h2>
        <div className="flex flex-wrap gap-2">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => handleRevealLetter(letter)}
              disabled={isLetterRevealed(letter) || !wheel.phrase}
              className={`flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold transition-colors ${
                isLetterRevealed(letter) || !wheel.phrase
                  ? "cursor-not-allowed border border-neutral-600 bg-neutral-700 text-neutral-500"
                  : "border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-white">Game Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => updateWheel((prev) => ({ ...prev, revealedAll: true }))}
            disabled={!wheel.phrase || wheel.revealedAll}
            className={`rounded-md px-6 py-3 font-semibold transition-colors ${
              !wheel.phrase || wheel.revealedAll
                ? "cursor-not-allowed border border-neutral-600 bg-neutral-700 text-neutral-500"
                : "border border-green-500 bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            Reveal All
          </button>
          <button
            type="button"
            onClick={() =>
              updateWheel((prev) => ({
                phrase: "",
                revealedLetters: [],
                revealedAll: false,
                zoom: prev.zoom,
              }))
            }
            className="rounded-md border border-red-500 bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
          >
            Reset Game
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-2 text-xl font-bold text-white">Board Zoom Control</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Adjust the size of the game board when it doesn&apos;t fit on screen.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() =>
              updateWheel((prev) => ({
                ...prev,
                zoom: Math.max(0.3, (prev.zoom || 1) - 0.1),
              }))
            }
            className="rounded-md border border-blue-500 bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Zoom Out
          </button>
          <button
            type="button"
            onClick={() =>
              updateWheel((prev) => ({
                ...prev,
                zoom: Math.min(2, (prev.zoom || 1) + 0.1),
              }))
            }
            className="rounded-md border border-blue-500 bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Zoom In
          </button>
          <button
            type="button"
            onClick={() => updateWheel((prev) => ({ ...prev, zoom: 1 }))}
            className="rounded-md border border-neutral-500 bg-neutral-600 px-4 py-2 font-semibold text-white hover:bg-neutral-700"
          >
            Reset Zoom (100%)
          </button>
          <div className="text-sm font-semibold text-neutral-300">
            Current: {Math.round((wheel.zoom || 1) * 100)}%
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-white">Game Status</h2>
        <div className="space-y-2 text-sm">
          <p className="text-neutral-300">
            <span className="font-semibold text-white">Revealed Letters:</span>{" "}
            {wheel.revealedLetters.length > 0
              ? wheel.revealedLetters.join(", ")
              : "None"}
          </p>
          <p className="text-neutral-300">
            <span className="font-semibold text-white">All Revealed:</span>{" "}
            {wheel.revealedAll ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </div>
  );
}
