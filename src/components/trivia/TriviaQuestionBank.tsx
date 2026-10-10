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
import type { TriviaBankQuestion } from "@/lib/trivia/types";

export function TriviaQuestionBank({
  questions,
  canSaveCurrent,
  canSaveUpcoming,
  onSaveCurrent,
  onSaveUpcoming,
  onLoad,
  onDelete,
}: {
  questions: TriviaBankQuestion[];
  canSaveCurrent: boolean;
  canSaveUpcoming: boolean;
  onSaveCurrent: () => void;
  onSaveUpcoming: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <>
      <BankPanel
        title="Questions"
        hint="Each saved question keeps its answer choices. Load adds it to the end of the upcoming queue. The question on screen stays."
        empty="No saved questions yet."
        actions={
          <>
            <button
              type="button"
              disabled={!canSaveCurrent}
              onClick={onSaveCurrent}
              className={bankSaveClass}
            >
              Save this question
            </button>
            <button
              type="button"
              disabled={!canSaveUpcoming}
              onClick={onSaveUpcoming}
              className={bankSaveClass}
            >
              Save upcoming
            </button>
          </>
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
                      onClick={() => onLoad(entry.id)}
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
                  {entry.question.trim()}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-400">
                  {entry.options.filter((option) => option.trim()).join(" · ")}
                </p>
              </BankRow>
            ))
          : null}
      </BankPanel>
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
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
