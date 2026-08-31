"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperatorNotice } from "@/components/operator/OperatorNotice";
import { useSound } from "@/lib/feud/useSound";
import { phraseHasLetter } from "@/lib/wheel/types";

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
  if (matchHover) return "text-amber-600";
  if (alreadyRevealed) return "text-green-600";
  return "text-white";
}

function letterControlClass(disabled: boolean): string {
  const base =
    "flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold transition-colors sm:h-20 sm:w-20 sm:text-3xl";
  if (disabled) {
    return `${base} cursor-not-allowed border border-neutral-600 bg-neutral-700 text-neutral-500`;
  }
  return `${base} border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700`;
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
      <p className={`${PHRASE_ROW_CLASS} text-green-600`} aria-live="polite">
        {summaryChars.map((char, index) => (
          <span key={`b-${index}`} className={`${PHRASE_CELL_CLASS} text-green-600`}>
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
  const spectatorLive = state.spectatorGame === "wheel";
  const sounds = useSound();
  const [phraseInput, setPhraseInput] = useState(wheel.phrase);
  const [topicInput, setTopicInput] = useState(wheel.topic);
  const [editing, setEditing] = useState(!wheel.phrase);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (wheel.phrase) return;
    setPhraseInput("");
    setTopicInput("");
    setEditing(true);
  }, [wheel.phrase]);

  const locked = Boolean(wheel.phrase) && !editing;

  const handleSetPhrase = () => {
    const nextPhrase = phraseInput.trim();
    if (!nextPhrase) return;
    const nextTopic = topicInput.trim();
    const phraseChanged = nextPhrase !== wheel.phrase;
    updateWheel((prev) => ({
      ...prev,
      phrase: nextPhrase,
      topic: nextTopic,
      revealedLetters: phraseChanged ? [] : prev.revealedLetters,
      revealedAll: phraseChanged ? false : prev.revealedAll,
      wrongCount: phraseChanged ? 0 : prev.wrongCount,
      zoom: prev.zoom || 1,
    }));
    setEditing(false);
  };

  const handleStartChange = () => {
    setPhraseInput(wheel.phrase);
    setTopicInput(wheel.topic);
    setEditing(true);
  };

  const handleRevealLetter = (letter: string) => {
    if (wheel.revealedLetters.includes(letter) || wheel.revealedAll) return;
    const hit = phraseHasLetter(wheel.phrase, letter);
    updateWheel((prev) => ({
      ...prev,
      revealedLetters: [...prev.revealedLetters, letter],
      wrongCount: hit ? prev.wrongCount : (prev.wrongCount ?? 0) + 1,
    }));
    if (!hit) sounds.wrong();
  };

  const isLetterGuessed = (letter: string) =>
    wheel.revealedLetters.includes(letter);

  const isLetterRevealed = (letter: string) =>
    isLetterGuessed(letter) || wheel.revealedAll;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
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
            <div className="inline-flex h-10 items-center gap-2">
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
                className="ml-1 inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-full p-6">
          <div className="space-y-6">
            {!spectatorLive && (
              <OperatorNotice>
                Spectator is not on Wheel of Riches. Use the Spectator screen
                list so the projector shows the board.
              </OperatorNotice>
            )}

            <div className="rounded-lg border border-neutral-700 bg-white p-6 shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">Current phrase</h2>
                {locked && (
                  <button
                    type="button"
                    onClick={handleStartChange}
                    className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
                  >
                    Change
                  </button>
                )}
              </div>
              {locked ? (
                <>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Topic
                  </p>
                  <p className="mb-4 text-lg font-semibold text-white">
                    {wheel.topic.trim() || "None"}
                  </p>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Phrase
                  </p>
                  <PhraseRevealRow
                    phrase={wheel.phrase}
                    revealedLetters={wheel.revealedLetters}
                    revealedAll={wheel.revealedAll}
                    onRevealLetter={handleRevealLetter}
                  />
                </>
              ) : (
                <>
                  <label className="mb-3 block">
                    <span className="mb-1.5 block text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                      Topic
                    </span>
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Shown on the spectator banner"
                      className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="mb-4 block">
                    <span className="mb-1.5 block text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                      Phrase
                    </span>
                    <input
                      type="text"
                      value={phraseInput}
                      onChange={(e) => setPhraseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSetPhrase();
                      }}
                      placeholder="Enter the phrase for the board"
                      className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Boolean(wheel.phrase) && (
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-neutral-300 hover:bg-neutral-700"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSetPhrase}
                      disabled={!phraseInput.trim()}
                      className="inline-flex h-10 items-center rounded-md border border-emerald-500 bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
                    >
                      Set
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg border border-neutral-700 bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-bold text-white">Letter Controls</h2>
              <div className="flex flex-wrap gap-3">
                {ALPHABET.map((letter) => {
                  const disabled = isLetterRevealed(letter) || !wheel.phrase;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleRevealLetter(letter)}
                      disabled={disabled}
                      className={letterControlClass(disabled)}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
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
            topic: "",
            revealedLetters: [],
            revealedAll: false,
            wrongCount: 0,
            zoom: prev.zoom,
          }))
        }
      />
    </div>
  );
}
