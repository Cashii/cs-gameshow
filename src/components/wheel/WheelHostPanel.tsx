"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, FolderOpen, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ResetButton } from "@/components/ui/ResetButton";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { Toast, useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  MAX_WHEEL_ZOOM,
  MIN_WHEEL_ZOOM,
  WHEEL_ZOOM_STEP,
  clampWheelZoom,
  createWheelBankPuzzle,
  loadWheelBankPuzzle,
  phraseHasLetter,
  type WheelBankPuzzle,
} from "@/lib/wheel/types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type PhraseForm =
  | { mode: "add"; topic: string; phrase: string }
  | { mode: "edit"; id: string; topic: string; phrase: string };

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
  const [bankOpen, setBankOpen] = useState(false);
  const [phraseForm, setPhraseForm] = useState<PhraseForm | null>(null);
  const { toastMessage, showToast } = useToast();

  useEffect(() => {
    if (wheel.phrase) return;
    setPhraseInput("");
    setTopicInput("");
    setEditing(true);
  }, [wheel.phrase]);

  const locked = Boolean(wheel.phrase) && !editing;
  const bank = wheel.bank ?? [];
  const boardHasProgress =
    Boolean(wheel.phrase.trim()) &&
    (wheel.revealedLetters.length > 0 ||
      wheel.revealedAll ||
      (wheel.wrongCount ?? 0) > 0);

  const saveBank = (next: WheelBankPuzzle[]) => {
    updateWheel((prev) => ({
      ...prev,
      bank: next,
      activeBankId:
        prev.activeBankId && next.some((item) => item.id === prev.activeBankId)
          ? prev.activeBankId
          : null,
    }));
  };

  const applyBoardZoom = (nextZoom: number) => {
    const zoom = clampWheelZoom(nextZoom);
    updateWheel((prev) => ({
      ...prev,
      zoom,
      bank: prev.activeBankId
        ? (prev.bank ?? []).map((entry) =>
            entry.id === prev.activeBankId ? { ...entry, zoom } : entry,
          )
        : prev.bank,
    }));
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
      zoom: clampWheelZoom(prev.zoom),
      activeBankId: null,
    }));
    setEditing(false);
  };

  const handleStartChange = () => {
    setPhraseInput(wheel.phrase);
    setTopicInput(wheel.topic);
    setEditing(true);
  };

  const applyLoadBank = (bankId: string) => {
    let loaded = false;
    updateWheel((prev) => {
      const next = loadWheelBankPuzzle(prev, bankId);
      if (!next) return prev;
      loaded = true;
      return next;
    });
    if (!loaded) {
      showToast("That bank item needs a phrase before you can load it.");
      return;
    }
    setEditing(false);
    setBankOpen(false);
    showToast("Phrase loaded from the bank.");
  };

  const handleLoadBank = (bankId: string) => {
    const item = bank.find((entry) => entry.id === bankId);
    if (!item?.phrase.trim()) {
      showToast("That bank item needs a phrase before you can load it.");
      return;
    }
    if (boardHasProgress) {
      setPendingLoadId(bankId);
      return;
    }
    applyLoadBank(bankId);
  };

  const currentInBank =
    Boolean(wheel.activeBankId) &&
    bank.some((item) => item.id === wheel.activeBankId);

  const handleSaveCurrentToBank = () => {
    const phrase = wheel.phrase.trim();
    if (!phrase) return;
    const topic = wheel.topic.trim();
    const zoom = clampWheelZoom(wheel.zoom);
    if (currentInBank && wheel.activeBankId) {
      const id = wheel.activeBankId;
      saveBank(
        bank.map((item) =>
          item.id === id ? { ...item, phrase, topic, zoom } : item,
        ),
      );
      showToast("Updated the bank entry for this phrase.");
      return;
    }
    const entry = createWheelBankPuzzle({ phrase, topic, zoom });
    updateWheel((prev) => ({
      ...prev,
      bank: [...(prev.bank ?? []), entry],
      activeBankId: entry.id,
    }));
    showToast("Current phrase saved to the bank.");
  };

  const savePhraseForm = () => {
    if (!phraseForm) return;
    const phrase = phraseForm.phrase.trim();
    if (!phrase) return;
    const topic = phraseForm.topic.trim();
    if (phraseForm.mode === "add") {
      saveBank([
        ...bank,
        createWheelBankPuzzle({
          phrase,
          topic,
          zoom: clampWheelZoom(wheel.zoom),
        }),
      ]);
      setPhraseForm(null);
      return;
    }
    const id = phraseForm.id;
    updateWheel((prev) => {
      const next = (prev.bank ?? []).map((item) =>
        item.id === id
          ? { ...item, phrase, topic, zoom: clampWheelZoom(item.zoom) }
          : item,
      );
      const isLive = prev.activeBankId === id;
      const phraseChanged = isLive && phrase !== prev.phrase;
      return {
        ...prev,
        bank: next,
        topic: isLive ? topic : prev.topic,
        phrase: isLive ? phrase : prev.phrase,
        revealedLetters: phraseChanged ? [] : prev.revealedLetters,
        revealedAll: phraseChanged ? false : prev.revealedAll,
        wrongCount: phraseChanged ? 0 : prev.wrongCount,
      };
    });
    setPhraseForm(null);
  };

  const handlePickBank = (bankId: string) => {
    if (bankId === wheel.activeBankId) {
      setBankOpen(false);
      return;
    }
    handleLoadBank(bankId);
  };

  const handleRevealLetter = (letter: string) => {
    if (wheel.revealedLetters.includes(letter) || wheel.revealedAll) return;
    const hit = phraseHasLetter(wheel.phrase, letter);
    updateWheel((prev) => ({
      ...prev,
      revealedLetters: [...prev.revealedLetters, letter],
      wrongCount:
        hit || prev.strikesEnabled === false
          ? prev.wrongCount
          : (prev.wrongCount ?? 0) + 1,
    }));
  };

  const isLetterGuessed = (letter: string) =>
    wheel.revealedLetters.includes(letter);

  const isLetterRevealed = (letter: string) =>
    isLetterGuessed(letter) || wheel.revealedAll;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
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
            <ResetButton onClick={() => setResetConfirmOpen(true)}>
              Reset Game
            </ResetButton>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-4">
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
            <div className="inline-flex h-10 items-center gap-2">
              <span className="text-sm font-semibold text-neutral-200">
                Strikes
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={wheel.strikesEnabled !== false}
                aria-label="Toggle strikes for wrong letters"
                onClick={() =>
                  updateWheel((prev) => ({
                    ...prev,
                    strikesEnabled: prev.strikesEnabled === false,
                  }))
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  wheel.strikesEnabled !== false
                    ? "bg-emerald-500"
                    : "bg-neutral-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    wheel.strikesEnabled !== false
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Word Up. Use the Spectator screen list so
          the projector shows the board.
        </SpectatorScreenNotice>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-full p-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Current phrase</h2>
                  <Tooltip content="Phrases and topics">
                    <button
                      type="button"
                      aria-label="Phrases and topics"
                      aria-haspopup="dialog"
                      onClick={() => setBankOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-sky-500 bg-sky-600 text-white hover:bg-sky-500"
                    >
                      <FolderOpen size={18} />
                    </button>
                  </Tooltip>
                  {locked && wheel.phrase.trim() ? (
                    <button
                      type="button"
                      onClick={handleSaveCurrentToBank}
                      className="inline-flex h-10 items-center rounded-md border border-sky-500 bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                      {currentInBank ? "Update in bank" : "Save to bank"}
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
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Board zoom
                  </span>
                  <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-neutral-300">
                    {Math.round(clampWheelZoom(wheel.zoom) * 100)}%
                  </span>
                  <div className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Zoom out"
                      disabled={clampWheelZoom(wheel.zoom) <= MIN_WHEEL_ZOOM}
                      onClick={() =>
                        applyBoardZoom(
                          clampWheelZoom(wheel.zoom) - WHEEL_ZOOM_STEP,
                        )
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Zoom in"
                      disabled={clampWheelZoom(wheel.zoom) >= MAX_WHEEL_ZOOM}
                      onClick={() =>
                        applyBoardZoom(
                          clampWheelZoom(wheel.zoom) + WHEEL_ZOOM_STEP,
                        )
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
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

          </div>
        </div>
      </div>

      <Dialog.Root
        open={bankOpen}
        onOpenChange={(open) => {
          setBankOpen(open);
          if (!open) setPhraseForm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[min(80vh,720px)] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
            onEscapeKeyDown={(event) => {
              if (!phraseForm) return;
              event.preventDefault();
              setPhraseForm(null);
            }}
          >
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute top-4 right-4 rounded p-1 text-neutral-400 hover:bg-neutral-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
            <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6 pr-14 pb-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Phrases and topics
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-neutral-400">
                  Pick a phrase to put it on the board. Each one shows its topic
                  and saved board zoom. Add, edit, or delete phrases here.
                </Dialog.Description>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {wheel.phrase.trim() ? (
                  <button
                    type="button"
                    onClick={handleSaveCurrentToBank}
                    className="inline-flex h-9 items-center rounded-lg border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
                  >
                    {currentInBank ? "Update current" : "Save current"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setPhraseForm({ mode: "add", topic: "", phrase: "" })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  <Plus size={16} />
                  Add phrase
                </button>
              </div>
            </div>
            {phraseForm?.mode === "add" ? (
              <form
                className="mx-6 mb-3 flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  savePhraseForm();
                }}
              >
                <input
                  value={phraseForm.topic}
                  onChange={(event) =>
                    setPhraseForm({
                      mode: "add",
                      topic: event.target.value,
                      phrase: phraseForm.phrase,
                    })
                  }
                  placeholder="Topic"
                  aria-label="New topic"
                  className="min-w-28 flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <input
                  value={phraseForm.phrase}
                  onChange={(event) =>
                    setPhraseForm({
                      mode: "add",
                      topic: phraseForm.topic,
                      phrase: event.target.value,
                    })
                  }
                  placeholder="Phrase"
                  aria-label="New phrase"
                  autoFocus
                  className="min-w-40 flex-2 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <span className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">
                  Zoom {Math.round(clampWheelZoom(wheel.zoom) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPhraseForm(null)}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!phraseForm.phrase.trim()}
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                    phraseForm.phrase.trim()
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                  }`}
                >
                  Add
                </button>
              </form>
            ) : null}
            {bank.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-neutral-500">
                No saved phrases yet. Save the current phrase, or add one here.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-6">
                {bank.map((item, index) => {
                  const selected = wheel.activeBankId === item.id;
                  const editing =
                    phraseForm?.mode === "edit" && phraseForm.id === item.id;
                  const rowClass = selected
                    ? "border-sky-500 bg-sky-950/40"
                    : "border-neutral-700 bg-neutral-800/60";
                  return (
                    <li
                      key={item.id}
                      className={`flex items-start gap-1 rounded-lg border pr-1 ${rowClass}`}
                    >
                      {editing && phraseForm?.mode === "edit" ? (
                        <form
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 px-3 py-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            savePhraseForm();
                          }}
                        >
                          <span className="w-5 shrink-0 text-sm font-semibold text-neutral-400">
                            {index + 1}
                          </span>
                          <input
                            value={phraseForm.topic}
                            onChange={(event) =>
                              setPhraseForm({
                                mode: "edit",
                                id: item.id,
                                topic: event.target.value,
                                phrase: phraseForm.phrase,
                              })
                            }
                            placeholder="Topic"
                            aria-label={`Topic for phrase ${index + 1}`}
                            className="min-w-28 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                          <input
                            value={phraseForm.phrase}
                            onChange={(event) =>
                              setPhraseForm({
                                mode: "edit",
                                id: item.id,
                                topic: phraseForm.topic,
                                phrase: event.target.value,
                              })
                            }
                            placeholder="Phrase"
                            aria-label={`Phrase ${index + 1}`}
                            autoFocus
                            className="min-w-40 flex-2 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                          <span className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">
                            Zoom {Math.round(clampWheelZoom(item.zoom) * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setPhraseForm(null)}
                            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!phraseForm.phrase.trim()}
                            className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                              phraseForm.phrase.trim()
                                ? "bg-blue-600 hover:bg-blue-500"
                                : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                            }`}
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePickBank(item.id)}
                          aria-current={selected ? "true" : undefined}
                          className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left"
                        >
                          <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-neutral-400">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white">
                              {item.phrase.trim() || "(no phrase)"}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                              {item.topic.trim() || "No topic"}
                              {" · "}
                              Zoom {Math.round(clampWheelZoom(item.zoom) * 100)}%
                            </span>
                          </span>
                          {selected ? (
                            <Check
                              size={16}
                              className="mt-0.5 shrink-0 text-sky-400"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      )}
                      {editing ? null : (
                        <div className="flex shrink-0 items-center gap-0.5 pt-2">
                          <button
                            type="button"
                            aria-label={`Edit phrase ${index + 1}`}
                            onClick={() =>
                              setPhraseForm({
                                mode: "edit",
                                id: item.id,
                                topic: item.topic,
                                phrase: item.phrase,
                              })
                            }
                            className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete phrase ${index + 1}`}
                            onClick={() =>
                              saveBank(
                                bank.filter((entry) => entry.id !== item.id),
                              )
                            }
                            className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast message={toastMessage} />

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Game"
        message="Clear the current phrase and revealed letters? Your phrases and topics stay saved."
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
