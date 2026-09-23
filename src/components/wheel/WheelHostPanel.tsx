"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperatorNotice } from "@/components/operator/OperatorNotice";
import {
  createWheelBankPuzzle,
  loadWheelBankPuzzle,
  phraseHasLetter,
  type WheelBankPuzzle,
} from "@/lib/wheel/types";

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
  const [phraseInput, setPhraseInput] = useState(wheel.phrase);
  const [topicInput, setTopicInput] = useState(wheel.topic);
  const [editing, setEditing] = useState(!wheel.phrase);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [bankDraft, setBankDraft] = useState<WheelBankPuzzle[]>(
    () => wheel.bank ?? [],
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (wheel.phrase) return;
    setPhraseInput("");
    setTopicInput("");
    setEditing(true);
  }, [wheel.phrase]);

  useEffect(() => {
    setBankDraft(wheel.bank ?? []);
  }, [wheel.bank]);

  const locked = Boolean(wheel.phrase) && !editing;
  const bank = bankDraft;
  const boardHasProgress =
    Boolean(wheel.phrase.trim()) &&
    (wheel.revealedLetters.length > 0 ||
      wheel.revealedAll ||
      (wheel.wrongCount ?? 0) > 0);

  const saveBank = (next: WheelBankPuzzle[]) => {
    setBankDraft(next);
    updateWheel((prev) => ({
      ...prev,
      bank: next,
      activeBankId:
        prev.activeBankId && next.some((item) => item.id === prev.activeBankId)
          ? prev.activeBankId
          : null,
    }));
  };

  const persistBankDraft = () => {
    updateWheel((prev) => {
      const next = bankDraft;
      const activeStillThere =
        prev.activeBankId &&
        next.some((item) => item.id === prev.activeBankId);
      // If the active bank item's text changed, keep the board in sync.
      let phrase = prev.phrase;
      let topic = prev.topic;
      let revealedLetters = prev.revealedLetters;
      let revealedAll = prev.revealedAll;
      let wrongCount = prev.wrongCount;
      if (activeStillThere && prev.activeBankId) {
        const active = next.find((item) => item.id === prev.activeBankId);
        if (active) {
          const nextPhrase = active.phrase.trim();
          const nextTopic = active.topic.trim();
          const phraseChanged = nextPhrase !== prev.phrase;
          phrase = nextPhrase;
          topic = nextTopic;
          if (phraseChanged) {
            revealedLetters = [];
            revealedAll = false;
            wrongCount = 0;
          }
        }
      }
      return {
        ...prev,
        bank: next,
        phrase,
        topic,
        revealedLetters,
        revealedAll,
        wrongCount,
        activeBankId: activeStillThere ? prev.activeBankId : null,
      };
    });
  };

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
      activeBankId: null,
    }));
    setEditing(false);
    setNotice("");
  };

  const handleStartChange = () => {
    setPhraseInput(wheel.phrase);
    setTopicInput(wheel.topic);
    setEditing(true);
  };

  const applyLoadBank = (bankId: string) => {
    let loaded = false;
    updateWheel((prev) => {
      const withDraft = { ...prev, bank: bankDraft };
      const next = loadWheelBankPuzzle(withDraft, bankId);
      if (!next) return prev;
      loaded = true;
      return next;
    });
    if (!loaded) {
      setNotice("That bank item needs a phrase before you can load it.");
      return;
    }
    setEditing(false);
    setNotice("Phrase loaded from the bank.");
  };

  const handleLoadBank = (bankId: string) => {
    const item = bank.find((entry) => entry.id === bankId);
    if (!item?.phrase.trim()) {
      setNotice("That bank item needs a phrase before you can load it.");
      return;
    }
    if (boardHasProgress) {
      setPendingLoadId(bankId);
      return;
    }
    applyLoadBank(bankId);
  };

  const handleSaveCurrentToBank = () => {
    const phrase = wheel.phrase.trim();
    if (!phrase) return;
    const topic = wheel.topic.trim();
    if (
      wheel.activeBankId &&
      bank.some((item) => item.id === wheel.activeBankId)
    ) {
      saveBank(
        bank.map((item) =>
          item.id === wheel.activeBankId
            ? { ...item, phrase, topic }
            : item,
        ),
      );
      setNotice("Updated the bank entry for this phrase.");
      return;
    }
    const entry = createWheelBankPuzzle({ phrase, topic });
    const next = [...bank, entry];
    setBankDraft(next);
    updateWheel((prev) => ({
      ...prev,
      bank: next,
      activeBankId: entry.id,
    }));
    setNotice("Current phrase saved to the bank.");
  };

  const handleRevealLetter = (letter: string) => {
    if (wheel.revealedLetters.includes(letter) || wheel.revealedAll) return;
    const hit = phraseHasLetter(wheel.phrase, letter);
    updateWheel((prev) => ({
      ...prev,
      revealedLetters: [...prev.revealedLetters, letter],
      wrongCount: hit ? prev.wrongCount : (prev.wrongCount ?? 0) + 1,
    }));
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

            {notice ? (
              <p className="text-sm text-sky-300">{notice}</p>
            ) : null}

            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">Current phrase</h2>
                <div className="flex flex-wrap gap-2">
                  {locked && wheel.phrase.trim() ? (
                    <button
                      type="button"
                      onClick={handleSaveCurrentToBank}
                      className="inline-flex h-10 items-center rounded-md border border-sky-500 bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                      {wheel.activeBankId &&
                      bank.some((item) => item.id === wheel.activeBankId)
                        ? "Update in bank"
                        : "Save to bank"}
                    </button>
                  ) : null}
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

            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
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

            <section className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Phrase bank ({bank.length})
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Preload topics and phrases, then load any one onto the board
                    whenever you want — including ones you already played.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    saveBank([...bank, createWheelBankPuzzle()])
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500"
                >
                  <Plus size={14} />
                  Add to bank
                </button>
              </div>
              {bank.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No saved phrases yet. Add entries here, or use Save to bank
                  from the current phrase.
                </p>
              ) : (
                <div className="space-y-2">
                  {bank.map((item, index) => {
                    const isActive = wheel.activeBankId === item.id;
                    return (
                      <article
                        key={item.id}
                        className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-2 ${
                          isActive
                            ? "border-sky-500 bg-sky-950/40"
                            : "border-neutral-700 bg-neutral-950"
                        }`}
                      >
                        <span className="w-16 shrink-0 text-xs font-semibold text-neutral-500">
                          {isActive ? "Live" : `#${index + 1}`}
                        </span>
                        <input
                          value={item.topic}
                          onChange={(e) => {
                            const value = e.target.value;
                            setBankDraft((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, topic: value }
                                  : entry,
                              ),
                            );
                          }}
                          onBlur={persistBankDraft}
                          placeholder="Topic"
                          aria-label={`Topic for bank item ${index + 1}`}
                          className="min-w-28 flex-1 basis-36 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-sm text-white"
                        />
                        <input
                          value={item.phrase}
                          onChange={(e) => {
                            const value = e.target.value;
                            setBankDraft((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, phrase: value }
                                  : entry,
                              ),
                            );
                          }}
                          onBlur={persistBankDraft}
                          placeholder="Phrase"
                          aria-label={`Phrase for bank item ${index + 1}`}
                          className="min-w-40 flex-[2] basis-52 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-sm text-white"
                        />
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={!item.phrase.trim()}
                            onClick={() => handleLoadBank(item.id)}
                            className="inline-flex h-8 items-center rounded-md border border-sky-500 bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
                          >
                            {isActive ? "Reload" : "Load"}
                          </button>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...bank];
                              const tmp = next[index - 1]!;
                              next[index - 1] = next[index]!;
                              next[index] = tmp;
                              saveBank(next);
                            }}
                            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={index === bank.length - 1}
                            onClick={() => {
                              const next = [...bank];
                              const tmp = next[index + 1]!;
                              next[index + 1] = next[index]!;
                              next[index] = tmp;
                              saveBank(next);
                            }}
                            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveBank(
                                bank.filter((entry) => entry.id !== item.id),
                              )
                            }
                            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                            aria-label="Remove from bank"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Game"
        message="Clear the current phrase and revealed letters? Your phrase bank stays saved."
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
            activeBankId: null,
          }))
        }
      />

      <ConfirmDialog
        open={pendingLoadId != null}
        onOpenChange={(open) => {
          if (!open) setPendingLoadId(null);
        }}
        title="Load phrase"
        message="The current board has progress. Load this bank phrase and clear revealed letters?"
        confirmLabel="Load"
        onConfirm={() => {
          if (pendingLoadId) applyLoadBank(pendingLoadId);
          setPendingLoadId(null);
        }}
      />
    </div>
  );
}
