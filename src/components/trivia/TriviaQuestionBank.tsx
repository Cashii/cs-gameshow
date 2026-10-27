"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  bankHeaderNeutralClass,
  bankHeaderSaveClass,
  bankIconButtonClass,
  bankIconDeleteClass,
  bankLoadClass,
  bankSaveClass,
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
import type { ContentGroup } from "@/lib/content-bank";

const bankNeutralClass =
  "h-9 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40";
import {
  DEFAULT_TRIVIA_OPTIONS,
  MAX_TRIVIA_OPTIONS,
  MIN_TRIVIA_OPTIONS,
  triviaChoiceIdAt,
  triviaChoiceLetter,
  triviaCorrectChoiceAfterRemoval,
  type TriviaBankQuestion,
  type TriviaChoiceId,
} from "@/lib/trivia/types";

type TriviaBankDraft = {
  question: string;
  options: string[];
  correctChoiceId: TriviaChoiceId | null;
};

function emptyDraft(): TriviaBankDraft {
  return {
    question: "",
    options: [...DEFAULT_TRIVIA_OPTIONS],
    correctChoiceId: null,
  };
}

export function TriviaQuestionBank({
  questions,
  groups,
  canSaveCurrent,
  canSaveUpcoming,
  canLoadToCurrent,
  onSaveCurrent,
  onSaveUpcoming,
  onAdd,
  onAddToUpcoming,
  onLoad,
  onLoadToCurrent,
  onUseAsCurrent,
  onUpdate,
  onDelete,
  onGroupsApply,
  openRequest = 0,
}: {
  questions: TriviaBankQuestion[];
  groups: ContentGroup[];
  canSaveCurrent: boolean;
  canSaveUpcoming: boolean;
  canLoadToCurrent: boolean;
  onSaveCurrent: (groupId: string | null) => void;
  onSaveUpcoming: (groupId: string | null) => void;
  onAdd: (entry: TriviaBankDraft, groupId: string | null) => void;
  onAddToUpcoming: (
    entry: TriviaBankDraft & { id?: string; groupId?: string | null },
  ) => void;
  onLoad: (id: string) => void;
  onLoadToCurrent: (id: string) => void;
  onUseAsCurrent: (
    entry: TriviaBankDraft & { id?: string; groupId?: string | null },
  ) => void;
  onUpdate: (id: string, entry: TriviaBankDraft) => void;
  onDelete: (id: string) => void;
  onGroupsApply: (next: {
    groups: ContentGroup[];
    items: TriviaBankQuestion[];
  }) => void;
  openRequest?: number;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const bankGroups = useBankGroups(groups, questions, onGroupsApply);
  const { selectedGroupId, visible } = bankGroups;

  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  const draftReady =
    draft.question.trim().length > 0 &&
    draft.options.length >= MIN_TRIVIA_OPTIONS &&
    draft.options.every((option) => option.trim().length > 0);

  const resetDraft = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const draftEntry = (): TriviaBankDraft => ({
    question: draft.question.trim(),
    options: draft.options.map((option) => option.trim()),
    correctChoiceId: draft.correctChoiceId,
  });

  const startEdit = (entry: TriviaBankQuestion) => {
    setEditingId(entry.id);
    setAdding(true);
    setDraft({
      question: entry.question,
      options: [...entry.options],
      correctChoiceId: entry.correctChoiceId,
    });
  };

  const submitDraft = () => {
    if (!draftReady) return;
    onAdd(draftEntry(), selectedGroupId);
    resetDraft();
  };

  const addDraftToUpcoming = () => {
    if (!draftReady) return;
    onAddToUpcoming({ ...draftEntry(), groupId: selectedGroupId });
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
            className={bankDialogClass}
            onEscapeKeyDown={(event) => {
              if (!adding) return;
              event.preventDefault();
              resetDraft();
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
                Saved questions
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-400">
                Each saved question keeps its answers. Mark the correct one so
                Survive shows which side to keep. Leave it blank if you do not
                know yet. Use now puts it on the current question. Add to
                upcoming stages it for later.
              </Dialog.Description>
            </div>
            {adding ? (
              <form
                className="mx-6 mb-3 space-y-2 rounded-lg border border-neutral-700 bg-neutral-800/60 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draftReady) return;
                  const entry = draftEntry();
                  if (editingId) {
                    onAddToUpcoming({
                      ...entry,
                      id: editingId,
                      groupId:
                        questions.find((item) => item.id === editingId)
                          ?.groupId ?? selectedGroupId,
                    });
                    resetDraft();
                    return;
                  }
                  addDraftToUpcoming();
                }}
              >
                <p className="text-xs font-semibold tracking-wide text-neutral-300 uppercase">
                  {editingId ? "Edit question" : "New question"}
                </p>
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
                <p className="text-xs text-neutral-500">
                  Mark the correct answer, or leave them all unmarked.
                </p>
                {draft.options.map((option, index) => {
                  const choiceId = triviaChoiceIdAt(index) ?? "a";
                  const letter = triviaChoiceLetter(choiceId);
                  const isCorrect = draft.correctChoiceId === choiceId;
                  return (
                    <div key={`draft-${index}`} className="block">
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                        Answer {letter}
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-pressed={isCorrect}
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                correctChoiceId:
                                  current.correctChoiceId === choiceId
                                    ? null
                                    : choiceId,
                              }))
                            }
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                              isCorrect
                                ? "bg-emerald-500 text-neutral-950"
                                : "bg-neutral-900 text-neutral-400 hover:text-emerald-300"
                            }`}
                          >
                            {isCorrect ? "Correct" : "Mark correct"}
                          </button>
                          {draft.options.length > MIN_TRIVIA_OPTIONS ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((current) => ({
                                  ...current,
                                  options: current.options.filter(
                                    (_, optionIndex) => optionIndex !== index,
                                  ),
                                  correctChoiceId: triviaCorrectChoiceAfterRemoval(
                                    current.correctChoiceId,
                                    index,
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
                        className={`mt-1.5 w-full rounded-lg border bg-neutral-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                          isCorrect ? "border-emerald-500" : "border-neutral-600"
                        }`}
                      />
                    </div>
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
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetDraft}
                    className={bankNeutralClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!draftReady}
                    onClick={() => {
                      if (!draftReady) return;
                      if (editingId) {
                        onUpdate(editingId, draftEntry());
                        resetDraft();
                        return;
                      }
                      submitDraft();
                    }}
                    className={bankSaveClass}
                  >
                    {editingId ? "Save changes" : "Save question"}
                  </button>
                  <button
                    type="button"
                    disabled={!draftReady || !canLoadToCurrent}
                    onClick={() => {
                      if (!draftReady || !canLoadToCurrent) return;
                      const entry = draftEntry();
                      onUseAsCurrent(
                        editingId
                          ? {
                              ...entry,
                              id: editingId,
                              groupId:
                                questions.find((item) => item.id === editingId)
                                  ?.groupId ?? selectedGroupId,
                            }
                          : { ...entry, groupId: selectedGroupId },
                      );
                      resetDraft();
                      setOpen(false);
                    }}
                    className={bankSaveClass}
                  >
                    Use now
                  </button>
                  <button
                    type="submit"
                    disabled={!draftReady}
                    className={bankNeutralClass}
                  >
                    Add to upcoming
                  </button>
                </div>
              </form>
            ) : null}
            <BankGroupSplit
              sidebar={
                <BankGroupColumn
                  groups={groups}
                  filter={bankGroups.filter}
                  onFilter={bankGroups.setFilter}
                  onAdd={bankGroups.addGroup}
                  onRename={bankGroups.renameGroup}
                  onDelete={bankGroups.deleteGroup}
                />
              }
            >
            <BankListHeader title="Questions">
              <button
                type="button"
                disabled={!canSaveCurrent}
                onClick={() => onSaveCurrent(selectedGroupId)}
                className={bankHeaderSaveClass}
              >
                Save current question
              </button>
              <button
                type="button"
                disabled={!canSaveUpcoming}
                onClick={() => onSaveUpcoming(selectedGroupId)}
                className={bankHeaderSaveClass}
              >
                Save upcoming
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft());
                  setAdding(true);
                }}
                className={bankHeaderNeutralClass}
              >
                <Plus size={14} />
                Add question
              </button>
            </BankListHeader>
            {questions.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No saved questions yet. Add one here.
              </p>
            ) : visible.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No questions in this group.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-3 pb-6">
                {visible.map((entry, index) => (
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
                              {entry.correctChoiceId === choiceId ? (
                                <span className="font-semibold text-emerald-300">
                                  {" "}
                                  · Correct
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={!canLoadToCurrent}
                        onClick={() => {
                          onLoadToCurrent(entry.id);
                          setOpen(false);
                        }}
                        className={bankLoadClass}
                      >
                        Use now
                      </button>
                      <button
                        type="button"
                        onClick={() => onLoad(entry.id)}
                        className="h-7 shrink-0 rounded-md border border-neutral-600 bg-neutral-800 px-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
                      >
                        Add to upcoming
                      </button>
                      <ChangeBankGroupButton
                        label={entry.question.trim() || `question ${index + 1}`}
                        onClick={() => bankGroups.openPicker(entry.id)}
                      />
                      <button
                        type="button"
                        aria-label={`Edit question ${index + 1}`}
                        title="Edit"
                        onClick={() => startEdit(entry)}
                        className={bankIconButtonClass}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(entry.id)}
                        className={bankIconDeleteClass}
                        aria-label={`Delete question ${index + 1}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </BankGroupSplit>
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
      <BankGroupPicker
        open={bankGroups.pickerItem != null}
        onOpenChange={(next) => {
          if (!next) bankGroups.closePicker();
        }}
        description={bankGroups.pickerItem?.question ?? ""}
        groups={groups}
        groupId={bankGroups.pickerItem?.groupId ?? null}
        onChoose={(groupId) => {
          if (!bankGroups.pickerItem) return;
          bankGroups.moveItem(bankGroups.pickerItem.id, groupId);
        }}
      />
    </>
  );
}
