"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function formatSpacedPhrase(
  phrase: string,
  mapLetter: (upper: string) => string,
): string {
  const tokens: string[] = [];

  for (const char of phrase) {
    if (char === " ") {
      tokens.push("·");
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      tokens.push(mapLetter(char.toUpperCase()));
      continue;
    }

    // Match audience board: skip common punctuation tiles
    if ("-'’—–".includes(char)) continue;

    tokens.push(char);
  }

  return tokens.join(" ").replace(/ · /g, " ").replace(/·/g, "").trim();
}

function formatBoardSummary(
  phrase: string,
  revealedLetters: string[],
  revealedAll: boolean,
): string {
  const revealed = new Set(revealedLetters.map((l) => l.toUpperCase()));
  return formatSpacedPhrase(phrase, (upper) =>
    revealedAll || revealed.has(upper) ? upper : "_",
  );
}

const PHRASE_ROW_CLASS =
  "grid w-full grid-cols-[repeat(auto-fill,1.2em)] justify-start gap-y-1";
const PHRASE_CELL_CLASS =
  "flex h-[1.35em] w-[1.2em] items-center justify-center font-mono text-xl leading-none font-semibold select-none sm:text-2xl";

function letterTextClass(matchHover: boolean, alreadyRevealed: boolean): string {
  if (matchHover) return "text-amber-400";
  if (alreadyRevealed) return "text-emerald-300";
  return "text-white";
}

function PhraseRevealRow({
  phrase,
  revealedLetters,
  revealedAll,
  onRevealLetter,
}: {
  phrase: string;
  revealedLetters: string[];
  revealedAll: boolean;
  onRevealLetter: (letter: string) => void;
}) {
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);
  const revealed = new Set(revealedLetters.map((l) => l.toUpperCase()));
  const displayChars = [...formatSpacedPhrase(phrase, (upper) => upper)];
  const summaryChars = [
    ...formatBoardSummary(phrase, revealedLetters, revealedAll),
  ];

  return (
    <>
      <p
        className={PHRASE_ROW_CLASS}
        onMouseLeave={() => setHoveredLetter(null)}
      >
        {displayChars.map((char, index) => {
          if (char === " ") {
            return (
              <span key={`s-${index}`} className={PHRASE_CELL_CLASS} aria-hidden>
                {"\u00a0"}
              </span>
            );
          }

          if (!/[A-Z]/.test(char)) {
            return (
              <span
                key={`p-${index}`}
                className={`${PHRASE_CELL_CLASS} text-white`}
              >
                {char}
              </span>
            );
          }

          const alreadyRevealed = revealedAll || revealed.has(char);
          const matchHover = hoveredLetter === char;
          return (
            <button
              key={`l-${index}`}
              type="button"
              onMouseEnter={() => setHoveredLetter(char)}
              onFocus={() => setHoveredLetter(char)}
              onClick={() => {
                if (!alreadyRevealed) onRevealLetter(char);
              }}
              aria-label={
                alreadyRevealed
                  ? `${char}, already revealed`
                  : `Reveal all ${char}s`
              }
              className={`${PHRASE_CELL_CLASS} appearance-none border-0 bg-transparent ${
                alreadyRevealed ? "cursor-default" : "cursor-pointer"
              } ${letterTextClass(matchHover, alreadyRevealed)}`}
            >
              {char}
            </button>
          );
        })}
      </p>
      <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        Board summary
      </p>
      <p className={`${PHRASE_ROW_CLASS} text-emerald-300`} aria-live="polite">
        {summaryChars.map((char, index) => (
          <span key={`b-${index}`} className={`${PHRASE_CELL_CLASS} text-emerald-300`}>
            {char === " " ? "\u00a0" : char}
          </span>
        ))}
      </p>
    </>
  );
}

export function WheelHostPanel() {
  const { state, updateWheel } = useSuite();
  const wheel = state.wheel;
  const [phraseInput, setPhraseInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSetPhrase = () => {
    if (!phraseInput.trim()) return;
    updateWheel((prev) => ({
      ...prev,
      phrase: phraseInput.trim(),
      revealedLetters: [],
      revealedAll: false,
      zoom: prev.zoom || 1,
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900/90 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Game actions
            </span>
            <button
              type="button"
              onClick={() =>
                updateWheel((prev) => ({ ...prev, revealedAll: true }))
              }
              disabled={!wheel.phrase || wheel.revealedAll}
              className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition-colors ${
                !wheel.phrase || wheel.revealedAll
                  ? "cursor-not-allowed border border-neutral-600 bg-neutral-700 text-neutral-500"
                  : "border border-green-500 bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              Reveal All
            </button>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="inline-flex h-10 items-center rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
            >
              Reset Game
            </button>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-600 bg-neutral-800 px-3">
              <span className="text-sm font-semibold text-neutral-200">
                Letter legend
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={wheel.showLetterLegend}
                aria-label="Toggle letter legend"
                onClick={() =>
                  updateWheel((prev) => ({
                    ...prev,
                    showLetterLegend: !prev.showLetterLegend,
                  }))
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  wheel.showLetterLegend ? "bg-emerald-500" : "bg-neutral-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    wheel.showLetterLegend ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Board zoom
            </span>
            <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-neutral-300">
              {Math.round((wheel.zoom || 1) * 100)}%
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() =>
                  updateWheel((prev) => ({
                    ...prev,
                    zoom: Math.max(0.3, (prev.zoom || 1) - 0.1),
                  }))
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Minus size={18} />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() =>
                  updateWheel((prev) => ({
                    ...prev,
                    zoom: Math.min(2, (prev.zoom || 1) + 0.1),
                  }))
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                onClick={() => updateWheel((prev) => ({ ...prev, zoom: 1 }))}
                className="ml-1 inline-flex h-10 items-center rounded-md border border-neutral-500 bg-neutral-600 px-3 text-sm font-semibold text-white hover:bg-neutral-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
          <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {wheel.phrase ? (
                  <>
                    <p className="mb-3 text-lg font-semibold text-white">
                      {wheel.phrase}
                    </p>
                    <div className="rounded-md border border-neutral-600 bg-neutral-900/70 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                        Current phrase
                      </p>
                      <PhraseRevealRow
                        phrase={wheel.phrase}
                        revealedLetters={wheel.revealedLetters}
                        revealedAll={wheel.revealedAll}
                        onRevealLetter={handleRevealLetter}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-neutral-400">Current Phrase</p>
                    <p className="text-lg font-semibold text-white">
                      No phrase set
                    </p>
                  </div>
                )}
              </div>
              <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
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
                      Enter the phrase for the game board. Letters will be
                      revealed as guessed.
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
            <div className="flex flex-wrap gap-3">
              {ALPHABET.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleRevealLetter(letter)}
                  disabled={isLetterRevealed(letter) || !wheel.phrase}
                  className={`flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold transition-colors sm:h-20 sm:w-20 sm:text-3xl ${
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
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Game"
        message="Are you sure you want to reset the game? This will clear the phrase and all revealed letters."
        confirmLabel="Reset Game"
        variant="danger"
        onConfirm={() =>
          updateWheel((prev) => ({
            ...prev,
            phrase: "",
            revealedLetters: [],
            revealedAll: false,
            zoom: prev.zoom,
          }))
        }
      />
    </div>
  );
}
