"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { bankHeaderSaveClass, bankIconDeleteClass, bankLoadClass } from "@/components/operator/BankPanel";
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
import {
  DEFAULT_QUESTION_TIME_TITLE,
  type QuestionTimeBankEntry,
} from "@/lib/question-time/types";

export function QuestionRepository({
  entries,
  groups,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onUpdate,
  onGroupsApply,
}: {
  entries: QuestionTimeBankEntry[];
  groups: ContentGroup[];
  canSave: boolean;
  onSave: (groupId: string | null) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { title: string; question: string }) => void;
  onGroupsApply: (next: {
    groups: ContentGroup[];
    items: QuestionTimeBankEntry[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState(entries);
  const [source, setSource] = useState(entries);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const bankGroups = useBankGroups(groups, drafts, onGroupsApply);

  if (source !== entries) {
    setSource(entries);
    setDrafts(entries);
  }

  const editDraft = (
    id: string,
    patch: Partial<Pick<QuestionTimeBankEntry, "title" | "question">>,
  ) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  return (
    <>
      <Tooltip content="Save and load questions">
        <button
          type="button"
          aria-label="Save and load questions"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sky-500 bg-sky-600 text-white hover:bg-sky-500"
        >
          <FolderOpen size={18} />
        </button>
      </Tooltip>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content className={bankDialogClass}>
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
                Question repository
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-400">
                Each saved question can be edited here. Load replaces the title
                and question on screen and leaves teams, scores, and the clock
                alone.
              </Dialog.Description>
            </div>
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
                disabled={!canSave}
                onClick={() => onSave(bankGroups.selectedGroupId)}
                className={bankHeaderSaveClass}
              >
                Save this question
              </button>
            </BankListHeader>
            {drafts.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No saved questions yet.
              </p>
            ) : bankGroups.visible.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No questions in this group.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-3 pb-6">
                {bankGroups.visible.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-3"
                  >
                    <span className="mt-1.5 w-5 shrink-0 text-sm font-semibold text-neutral-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <input
                        value={entry.title}
                        onChange={(event) =>
                          editDraft(entry.id, { title: event.target.value })
                        }
                        onBlur={(event) =>
                          onUpdate(entry.id, {
                            title: event.target.value,
                            question: entry.question,
                          })
                        }
                        placeholder={DEFAULT_QUESTION_TIME_TITLE}
                        aria-label="Saved title"
                        className="mb-1.5 h-8 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
                      />
                      <input
                        value={entry.question}
                        onChange={(event) =>
                          editDraft(entry.id, { question: event.target.value })
                        }
                        onBlur={(event) =>
                          onUpdate(entry.id, {
                            title: entry.title,
                            question: event.target.value,
                          })
                        }
                        placeholder="Question"
                        aria-label="Saved question"
                        className="h-8 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ChangeBankGroupButton
                        label={entry.question.trim() || `question ${index + 1}`}
                        onClick={() => bankGroups.openPicker(entry.id)}
                      />
                      <button
                        type="button"
                        disabled={!entry.question.trim()}
                        onClick={() => setPendingLoadId(entry.id)}
                        className={bankLoadClass}
                      >
                        Load
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
        open={pendingLoadId != null}
        onOpenChange={(next) => {
          if (!next) setPendingLoadId(null);
        }}
        title="Load question"
        message="This replaces the title and question on screen. Teams, scores, and the clock stay."
        confirmLabel="Load"
        onConfirm={() => {
          if (pendingLoadId) onLoad(pendingLoadId);
          setOpen(false);
        }}
      />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteId(null);
        }}
        title="Delete question"
        message="This removes the saved question. The question on screen stays."
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
