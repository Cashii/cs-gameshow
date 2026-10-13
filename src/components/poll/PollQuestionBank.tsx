"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { bankLoadClass, bankSaveClass } from "@/components/operator/BankPanel";
import type { PollBankQuestion } from "@/lib/poll/types";

export function PollQuestionBank({
  questions,
  canSave,
  onSave,
  onLoad,
  onDelete,
}: {
  questions: PollBankQuestion[];
  canSave: boolean;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[min(80vh,720px)] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
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
                  Saved questions
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-neutral-400">
                  Each saved question keeps its choices. Load replaces the
                  current poll, clears the votes, and leaves it idle.
                </Dialog.Description>
              </div>
              <button
                type="button"
                disabled={!canSave}
                onClick={onSave}
                className={bankSaveClass}
              >
                Save this question
              </button>
            </div>
            {questions.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-neutral-500">
                No saved questions yet.
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
                        {entry.question.trim() || "(no question)"}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {entry.choices.map((choice, choiceIndex) => (
                          <li
                            key={`${entry.id}-${choiceIndex}`}
                            className="text-xs leading-relaxed text-neutral-300"
                          >
                            <span className="font-semibold text-neutral-400">
                              {String.fromCharCode(65 + choiceIndex)}
                            </span>
                            {" · "}
                            {choice.text.trim() || "(blank)"}
                            {choiceIndex === entry.correctChoiceIndex ? (
                              <span className="text-emerald-300">
                                {" "}
                                (correct)
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
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
        open={pendingLoadId != null}
        onOpenChange={(next) => {
          if (!next) setPendingLoadId(null);
        }}
        title="Load question"
        message="This replaces the current poll and clears its votes. Past polls stay."
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
        message="This removes the saved question. The current poll stays."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
        }}
      />
    </>
  );
}
