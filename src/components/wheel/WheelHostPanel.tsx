"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Eye,
  FolderOpen,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast, useToast } from "@/components/ui/Toast";
import { StackedIconButton } from "@/components/ui/StackedIconButton";
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

function DisplayCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-200">
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="absolute inset-0 m-0 h-4 w-4 cursor-pointer appearance-none rounded border border-neutral-500 bg-transparent checked:border-sky-500 checked:bg-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500"
        />
        <Check
          size={12}
          strokeWidth={3}
          aria-hidden
          className={`pointer-events-none relative z-10 ${checked ? "text-white" : "text-transparent"}`}
        />
      </span>
      {label}
    </label>
  );
}

export function WheelHostPanel() {
  const { state, updateWheel } = useSuite();
  const wheel = state.wheel;
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

  const loadSavedPhraseButton = (
    <Tooltip content="Load saved phrase" delayDuration={0} size="md">
      <StackedIconButton
        aria-label="Load saved phrase"
        aria-haspopup="dialog"
        onClick={() => setBankOpen(true)}
        icon={<FolderOpen size={18} />}
        label="Load"
      />
    </Tooltip>
  );

  const resetButton = (
    <Tooltip content="Reset game?" delayDuration={0} size="md">
      <StackedIconButton
        aria-label="Reset game?"
        onClick={() => setResetConfirmOpen(true)}
        icon={<RotateCcw size={18} />}
        label="Reset"
      />
    </Tooltip>
  );

  const boardZoomControls = (
    <div className="flex shrink-0 flex-col items-start gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        Board Zoom
      </span>
      <div className="flex h-16 items-center gap-3">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={clampWheelZoom(wheel.zoom) <= MIN_WHEEL_ZOOM}
          onClick={() =>
            applyBoardZoom(clampWheelZoom(wheel.zoom) - WHEEL_ZOOM_STEP)
          }
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-600 bg-neutral-800 text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          <Minus size={18} />
        </button>
        <span className="min-w-12 text-center text-sm font-semibold tabular-nums text-neutral-300">
          {Math.round(clampWheelZoom(wheel.zoom) * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={clampWheelZoom(wheel.zoom) >= MAX_WHEEL_ZOOM}
          onClick={() =>
            applyBoardZoom(clampWheelZoom(wheel.zoom) + WHEEL_ZOOM_STEP)
          }
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-600 bg-neutral-800 text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );

  const boardDisplayActions = (
    <div className="ml-auto flex shrink-0 flex-col items-start gap-1.5">
      <span
        className="text-xs font-semibold tracking-wide uppercase invisible"
        aria-hidden
      >
        Board Zoom
      </span>
      <div className="flex h-16 items-center gap-4">
        <DisplayCheckbox
          checked={wheel.showLetterLegend}
          label="Letter legend"
          onChange={() =>
            updateWheel((prev) => ({
              ...prev,
              showLetterLegend: !prev.showLetterLegend,
            }))
          }
        />
        <DisplayCheckbox
          checked={wheel.strikesEnabled !== false}
          label="Show strikes"
          onChange={() =>
            updateWheel((prev) => ({
              ...prev,
              strikesEnabled: prev.strikesEnabled === false,
            }))
          }
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-full px-6 py-6">
          <div>
            <section>
              {locked ? (
                <>
                  <div className="mb-4 flex w-full flex-wrap items-start gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                        Topic on display
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-white">
                          {wheel.topic.trim() || "None"}
                        </p>
                        <Tooltip content="Edit display" delayDuration={0} size="md">
                          <StackedIconButton
                            aria-label="Edit display"
                            onClick={handleStartChange}
                            icon={<Pencil size={18} />}
                            label="Edit"
                          />
                        </Tooltip>
                        {resetButton}
                        {loadSavedPhraseButton}
                      </div>
                    </div>
                    {boardZoomControls}
                    {boardDisplayActions}
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
                  <div className="mb-3 flex w-full flex-wrap items-start gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <label
                        htmlFor="wheel-topic-on-display"
                        className="mb-1.5 block text-xs font-semibold tracking-wide text-neutral-400 uppercase"
                      >
                        Topic on display
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          id="wheel-topic-on-display"
                          type="text"
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          placeholder="Shown on the spectator banner"
                          className="w-md max-w-full rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
                        />
                        {loadSavedPhraseButton}
                        {resetButton}
                      </div>
                    </div>
                    {boardZoomControls}
                    {boardDisplayActions}
                  </div>
                  <label className="mb-4 block w-xl max-w-full">
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
                      className="w-full rounded-md border border-neutral-600 bg-neutral-700 px-3 py-2 text-white placeholder-neutral-500"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
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
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  Letter Controls
                </h2>
                <div className="flex flex-wrap items-center gap-2">
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
                    className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:text-neutral-500"
                  >
                    <RotateCcw size={16} />
                    Reset Letters
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateWheel((prev) => ({ ...prev, revealedAll: true }))
                    }
                    disabled={!wheel.phrase || wheel.revealedAll}
                    className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-green-300 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:text-neutral-500"
                  >
                    <Eye size={16} />
                    Reveal All
                  </button>
                </div>
              </div>
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
                  className="min-w-28 flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500"
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
                  className="min-w-40 flex-2 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500"
                />
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
                            className="w-36 max-w-full shrink-0 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white"
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
                            className="w-72 max-w-full shrink-0 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white"
                          />
                          <span className="shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">
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
