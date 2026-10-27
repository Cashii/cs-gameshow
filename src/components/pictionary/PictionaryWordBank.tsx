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
import type { PictionaryBankWord } from "@/lib/pictionary/types";

export function PictionaryWordBank({
  words,
  groups,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onGroupsApply,
}: {
  words: PictionaryBankWord[];
  groups: ContentGroup[];
  canSave: boolean;
  onSave: (groupId: string | null) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onGroupsApply: (next: {
    groups: ContentGroup[];
    items: PictionaryBankWord[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const bankGroups = useBankGroups(groups, words, onGroupsApply);

  return (
    <>
      <Tooltip content="Save and load words">
        <button
          type="button"
          aria-label="Save and load words"
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
                Word bank
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-400">
                Each saved row is a word or phrase. Load puts it on the board,
                closes the curtain, and resets the clock.
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
            <BankListHeader title="Words">
              <button
                type="button"
                disabled={!canSave}
                onClick={() => onSave(bankGroups.selectedGroupId)}
                className={bankHeaderSaveClass}
              >
                Save current word
              </button>
            </BankListHeader>
            {words.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No saved words yet.
              </p>
            ) : bankGroups.visible.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No words in this group.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-3 pb-6">
                {bankGroups.visible.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-3"
                  >
                    <span className="w-5 shrink-0 text-sm font-semibold text-neutral-400">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {entry.word.trim() || "(blank)"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ChangeBankGroupButton
                        label={entry.word.trim() || `word ${index + 1}`}
                        onClick={() => bankGroups.openPicker(entry.id)}
                      />
                      <button
                        type="button"
                        onClick={() => setPendingLoadId(entry.id)}
                        className={bankLoadClass}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(entry.id)}
                        className={bankIconDeleteClass}
                        aria-label={`Delete word ${index + 1}`}
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
        title="Load word"
        message="This replaces the word on the board and closes the curtain."
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
        title="Delete word"
        message="This removes the saved word. The board stays as it is."
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
        description={bankGroups.pickerItem?.word ?? ""}
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
