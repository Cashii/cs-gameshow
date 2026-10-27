"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, FolderOpen, Minus, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ResetButton } from "@/components/ui/ResetButton";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { Toast, useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  bankHeaderNeutralClass,
  bankHeaderSaveClass,
  bankIconButtonClass,
  bankIconDeleteClass,
} from "@/components/operator/BankPanel";
import {
  bankDialogClass,
  BankListHeader,
  BankGroupColumn,
  BankGroupPicker,
  BankGroupSplit,
  ChangeBankGroupButton,
  useBankGroups,
} from "@/components/operator/BankGroups";
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

type PhraseChar =
  | { kind: "letter"; char: string }
  | { kind: "mark"; char: string };

function phraseWords(phrase: string): PhraseChar[][] {
  const words: PhraseChar[][] = [];
  let current: PhraseChar[] = [];

  const pushWord = () => {
    if (current.length === 0) return;
    words.push(current);
    current = [];
  };

  for (const char of phrase) {
    if (char === " ") {
      pushWord();
      continue;
    }
    if (/[a-zA-Z]/.test(char)) {
      current.push({ kind: "letter", char: char.toUpperCase() });
      continue;
    }
    if ("-'’—–".includes(char)) continue;
    current.push({ kind: "mark", char });
  }

  pushWord();
  return words;
}

const PHRASE_BOX_CLASS =
  "inline-flex h-16 w-14 shrink-0 items-center justify-center rounded-lg font-mono text-4xl leading-none font-bold select-none";

function letterControlClass(disabled: boolean): string {
  const base =
    "flex h-16 w-16 items-center justify-center rounded-lg font-mono text-4xl leading-none font-bold transition-colors sm:h-20 sm:w-20";
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
  const words = phraseWords(phrase);

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-x-8 gap-y-3"
        onMouseLeave={() => setHoveredLetter(null)}
      >
        {words.map((word, wordIndex) => (
          <span
            key={`word-${wordIndex}`}
            className="inline-flex max-w-full flex-wrap gap-2"
          >
            {word.map((token, index) => {
              if (token.kind === "mark") {
                return (
                  <span
                    key={`m-${wordIndex}-${index}`}
                    className={`${PHRASE_BOX_CLASS} text-white`}
                  >
                    {token.char}
                  </span>
                );
              }

              const alreadyRevealed = revealedAll || revealed.has(token.char);
              const matchHover = hoveredLetter === token.char;
              return (
                <button
                  key={`l-${wordIndex}-${index}`}
                  type="button"
                  onMouseEnter={() => setHoveredLetter(token.char)}
                  onFocus={() => setHoveredLetter(token.char)}
                  onClick={() => {
                    if (!alreadyRevealed) onRevealLetter(token.char);
                  }}
                  aria-label={
                    alreadyRevealed
                      ? `${token.char}, already revealed`
                      : `Reveal all ${token.char}s`
                  }
                  className={`${PHRASE_BOX_CLASS} border-2 bg-transparent transition-colors duration-300 ease-out ${
                    alreadyRevealed
                      ? "cursor-default border-green-500 text-green-500"
                      : matchHover
                        ? "cursor-pointer border-amber-400 text-neutral-300/55"
                        : "cursor-pointer border-neutral-500 text-neutral-400/45 hover:border-amber-400"
                  }`}
                >
                  {token.char}
                </button>
              );
            })}
          </span>
        ))}
      </div>
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
  const { toastMessage, toastTone, showToast } = useToast();

  useEffect(() => {
    if (wheel.phrase) return;
    setPhraseInput("");
    setTopicInput("");
    setEditing(true);
  }, [wheel.phrase]);

  const locked = Boolean(wheel.phrase) && !editing;
  const bank = wheel.bank ?? [];
  const phraseGroups = wheel.groups ?? [];
  const bankGroups = useBankGroups(phraseGroups, bank, (next) => {
    updateWheel((prev) => ({
      ...prev,
      groups: next.groups,
      bank: next.items,
      activeBankId:
        prev.activeBankId &&
        next.items.some((item) => item.id === prev.activeBankId)
          ? prev.activeBankId
          : null,
    }));
  });
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
      showToast("That bank item needs a phrase before you can load it.", "error");
      return;
    }
    setEditing(false);
    setBankOpen(false);
    showToast("Phrase loaded from the bank.");
  };

  const handleLoadBank = (bankId: string) => {
    const item = bank.find((entry) => entry.id === bankId);
    if (!item?.phrase.trim()) {
      showToast("That bank item needs a phrase before you can load it.", "error");
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
    if (!phrase || currentInBank) return;
    const entry = createWheelBankPuzzle({
      phrase,
      topic: wheel.topic.trim(),
      zoom: clampWheelZoom(wheel.zoom),
      groupId: bankGroups.selectedGroupId,
    });
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
          groupId: bankGroups.selectedGroupId,
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
            {locked && (
              <button
                type="button"
                onClick={handleStartChange}
                className="inline-flex h-10 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Edit Display
              </button>
            )}
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
              disabled={!boardHasProgress}
              onClick={() =>
                updateWheel((prev) => ({
                  ...prev,
                  revealedLetters: [],
                  revealedAll: false,
                  wrongCount: 0,
                }))
              }
              className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-500 bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500"
            >
              <RotateCcw size={16} />
              Reset phrase
            </button>
            <ResetButton onClick={() => setResetConfirmOpen(true)}>
              Reset Game
            </ResetButton>
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
        <div className="w-full px-6 py-6">
          <div>
            <section>
              {locked ? (
                <>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                        Topic on display
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {wheel.topic.trim() || "None"}
                      </p>
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
                  <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Phrase on display
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
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <label className="min-w-0 flex-1">
                      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                        Topic on display
                      </span>
                      <input
                        type="text"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        placeholder="Shown on the spectator banner"
                        className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </label>
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
                  <label className="mb-4 block">
                    <span className="mb-1.5 block text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                      Phrase on display
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
            </section>

            <section className="mt-6 border-t border-neutral-700 pt-6">
              <h2 className="mb-4 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Letter Controls
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
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
            </section>
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
            className={bankDialogClass}
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
            <div className="px-6 pt-6 pr-14 pb-4">
              <Dialog.Title className="text-lg font-semibold text-white">
                Phrases and topics
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-400">
                Pick a phrase to put it on the board. Each one shows its topic
                and saved board zoom. Add, edit, or delete phrases here.
              </Dialog.Description>
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
            <BankGroupSplit
              sidebar={
                <BankGroupColumn
                  groups={phraseGroups}
                  filter={bankGroups.filter}
                  onFilter={bankGroups.setFilter}
                  onAdd={bankGroups.addGroup}
                  onRename={bankGroups.renameGroup}
                  onDelete={bankGroups.deleteGroup}
                />
              }
            >
            <BankListHeader title="Phrases">
              {wheel.phrase.trim() && !currentInBank ? (
                <button
                  type="button"
                  onClick={handleSaveCurrentToBank}
                  className={bankHeaderSaveClass}
                >
                  Save current
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setPhraseForm({ mode: "add", topic: "", phrase: "" })
                }
                className={bankHeaderNeutralClass}
              >
                <Plus size={14} />
                Add phrase
              </button>
            </BankListHeader>
            {bank.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No saved phrases yet. Save the current phrase, or add one here.
              </p>
            ) : bankGroups.visible.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No phrases in this group.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-3 pb-6">
                {bankGroups.visible.map((item, index) => {
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
                            <span className="text-sm font-semibold text-white">
                              {item.phrase.trim() || "(no phrase)"}
                              {selected ? (
                                <Check
                                  size={16}
                                  className="ml-1.5 inline-block align-[-2px] text-sky-400"
                                  aria-hidden
                                />
                              ) : null}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                              {item.topic.trim() || "No topic"}
                              {" · "}
                              Zoom {Math.round(clampWheelZoom(item.zoom) * 100)}%
                            </span>
                          </span>
                        </button>
                      )}
                      {editing ? null : (
                        <div className="flex shrink-0 items-center gap-0.5 pt-2">
                          <ChangeBankGroupButton
                            label={item.phrase.trim() || `phrase ${index + 1}`}
                            onClick={() => bankGroups.openPicker(item.id)}
                          />
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
                            className={bankIconButtonClass}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete phrase ${index + 1}`}
                            onClick={() =>
                              saveBank(
                                bank.filter((entry) => entry.id !== item.id),
                              )
                            }
                            className={bankIconDeleteClass}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            </BankGroupSplit>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <BankGroupPicker
        open={bankGroups.pickerItem != null}
        onOpenChange={(next) => {
          if (!next) bankGroups.closePicker();
        }}
        description={bankGroups.pickerItem?.phrase ?? ""}
        groups={phraseGroups}
        groupId={bankGroups.pickerItem?.groupId ?? null}
        onChoose={(groupId) => {
          if (!bankGroups.pickerItem) return;
          bankGroups.moveItem(bankGroups.pickerItem.id, groupId);
        }}
      />

      <Toast message={toastMessage} tone={toastTone} />

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
