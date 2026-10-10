"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  BankPanel,
  BankRow,
  bankDeleteClass,
  bankLoadClass,
  bankSaveClass,
} from "@/components/operator/BankPanel";
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
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <>
      <BankPanel
        title="Questions"
        hint="Each saved question keeps its choices. Load replaces the current poll, clears the votes, and leaves it idle."
        empty="No saved questions yet."
        actions={
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className={bankSaveClass}
          >
            Save this question
          </button>
        }
      >
        {questions.length > 0
          ? questions.map((entry) => (
              <BankRow
                key={entry.id}
                actions={
                  <>
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
                      className={bankDeleteClass}
                    >
                      Delete
                    </button>
                  </>
                }
              >
                <p className="truncate text-sm font-semibold text-neutral-100">
                  {entry.question.trim() || "(no question)"}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {entry.choices
                    .map((choice, index) =>
                      index === entry.correctChoiceIndex
                        ? `${choice.text.trim()} (correct)`
                        : choice.text.trim(),
                    )
                    .join(" · ")}
                </p>
              </BankRow>
            ))
          : null}
      </BankPanel>
      <ConfirmDialog
        open={pendingLoadId != null}
        onOpenChange={(open) => {
          if (!open) setPendingLoadId(null);
        }}
        title="Load question"
        message="This replaces the current poll and clears its votes. Past polls stay."
        confirmLabel="Load"
        onConfirm={() => {
          if (pendingLoadId) onLoad(pendingLoadId);
        }}
      />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
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
