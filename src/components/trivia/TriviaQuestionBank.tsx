"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen, Plus, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { bankSaveClass } from "@/components/operator/BankPanel";
import {
  DEFAULT_TRIVIA_OPTIONS,
  MAX_TRIVIA_OPTIONS,
  MIN_TRIVIA_OPTIONS,
  triviaChoiceIdAt,
  triviaChoiceLetter,
  type TriviaBankQuestion,
} from "@/lib/trivia/types";

function emptyDraft() {
  return {
    question: "",
    options: [...DEFAULT_TRIVIA_OPTIONS],
  };
}

export function TriviaQuestionBank({
  questions,
  canSaveCurrent,
  canSaveUpcoming,
  onSaveCurrent,
  onSaveUpcoming,
  onAdd,
  onAddToUpcoming,
  onLoad,
  onDelete,
  openRequest = 0,
}: {
  questions: TriviaBankQuestion[];
  canSaveCurrent: boolean;
  canSaveUpcoming: boolean;
  onSaveCurrent: () => void;
  onSaveUpcoming: () => void;
  onAdd: (entry: { question: string; options: string[] }) => void;
  onAddToUpcoming: (entry: { question: string; options: string[] }) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  openRequest?: number;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  const draftReady =
    draft.question.trim().length > 0 &&
    draft.options.length >= MIN_TRIVIA_OPTIONS &&
    draft.options.every((option) => option.trim().length > 0);

  const resetDraft = () => {
    setAdding(false);
    setDraft(emptyDraft());
  };

  const draftEntry = () => ({
    question: draft.question.trim(),
    options: draft.options.map((option) => option.trim()),
  });

  const submitDraft = () => {
    if (!draftReady) return;
    onAdd(draftEntry());
    resetDraft();
  };

  const addDraftToUpcoming = () => {
    if (!draftReady) return;
    onAddToUpcoming(draftEntry());
    resetDraft();
  };

  return (
    <>
        <Tooltip content="Save and load questions">
        <button
          type="button"
          aria-label="Save and load questions"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-sky-500 bg-sky-600 text-white hover:bg-sky-500"
        >
          <FolderOpen size={18} />
        </button>
      </Tooltip>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetDraft();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[min(80vh,720px)] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
            onEscapeKeyDown={(event) => {
              if (!adding) return;
              event.preventDefault();
              resetDraft();
            }}
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Saved questions
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-neutral-400">
                  Each saved question keeps its answers. Add one to the upcoming
                  list, or set up a new question here.
                </Dialog.Description>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(emptyDraft());
                    setAdding(true);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  <Plus size={16} />
                  Add question
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-800"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-6 pb-4">
              <button
                type="button"
                disabled={!canSaveCurrent}
                onClick={onSaveCurrent}
                className={bankSaveClass}
              >
                Save current question
              </button>
              <button
                type="button"
                disabled={!canSaveUpcoming}
                onClick={onSaveUpcoming}
                className={bankSaveClass}
              >
                Save upcoming
              </button>
            </div>
            {adding ? (
              <form
                className="mx-6 mb-3 space-y-2 rounded-lg border border-neutral-700 bg-neutral-800/60 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addDraftToUpcoming();
                }}
              >
                <label className="block">
                  <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Question
                  </span>
                  <input
                    value={draft.question}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        question: event.target.value,
                      }))
                    }
                    placeholder="True or false: …"
                    aria-label="New question"
                    autoFocus
                    className="mt-1.5 w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </label>
                {draft.options.map((option, index) => {
                  const letter = triviaChoiceLetter(
                    triviaChoiceIdAt(index) ?? "a",
                  );
                  return (
                    <label key={`draft-${index}`} className="block">
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                        Answer {letter}
                        {draft.options.length > MIN_TRIVIA_OPTIONS ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                options: current.options.filter(
                                  (_, optionIndex) => optionIndex !== index,
                                ),
                              }))
                            }
                            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-900 hover:text-red-300"
                            aria-label={`Remove answer ${letter}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </span>
                      <input
                        value={option}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            options: current.options.map((item, optionIndex) =>
                              optionIndex === index ? event.target.value : item,
                            ),
                          }))
                        }
                        aria-label={`Answer ${letter}`}
                        className="mt-1.5 w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </label>
                  );
                })}
                {draft.options.length < MAX_TRIVIA_OPTIONS ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        options: [
                          ...current.options,
                          `Answer ${current.options.length + 1}`,
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300"
                  >
                    <Plus size={12} />
                    Add answer
                  </button>
                ) : null}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!draftReady}
                    onClick={submitDraft}
                    className={bankSaveClass}
                  >
                    Save question
                  </button>
                  <button
                    type="submit"
                    disabled={!draftReady}
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                      draftReady
                        ? "bg-blue-600 hover:bg-blue-500"
                        : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                    }`}
                  >
                    Add to upcoming
                  </button>
                </div>
              </form>
            ) : null}
            {questions.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-neutral-500">
                No saved questions yet. Add one here.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-6">
                {questions.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-3"
                  >
                    <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-neutral-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {entry.question.trim() || "(blank)"}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {entry.options.map((option, optionIndex) => {
                          const choiceId = triviaChoiceIdAt(optionIndex);
                          if (!choiceId) return null;
                          return (
                            <li
                              key={`${entry.id}-${choiceId}`}
                              className="text-xs leading-relaxed text-neutral-300"
                            >
                              <span className="font-semibold text-neutral-400">
                                {triviaChoiceLetter(choiceId)}
                              </span>
                              {" · "}
                              {option.trim() || "(blank)"}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onLoad(entry.id)}
                        className="h-7 shrink-0 rounded-md border border-teal-500 bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-500"
                      >
                        Add to upcoming
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(entry.id)}
                        className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                        aria-label={`Delete question ${index + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteId(null);
        }}
        title="Delete question"
        message="This removes the saved question. The live question and upcoming queue stay."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
        }}
      />
    </>
  );
}
