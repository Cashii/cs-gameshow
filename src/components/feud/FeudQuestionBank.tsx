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
import type { FeudBankQuestion } from "@/lib/feud/types";

export function FeudQuestionBank({
  questions,
  canSaveCurrent,
  canSaveAll,
  onSaveCurrent,
  onSaveAll,
  onLoad,
  onLoadAll,
  onDelete,
}: {
  questions: FeudBankQuestion[];
  canSaveCurrent: boolean;
  canSaveAll: boolean;
  onSaveCurrent: () => void;
  onSaveAll: () => void;
  onLoad: (id: string) => void;
  onLoadAll: () => void;
  onDelete: (id: string) => void;
}) {
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingLoadAll, setPendingLoadAll] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <>
      <BankPanel
        title="Questions"
        hint="Each saved question keeps its answers and points. Loading one replaces the question on screen. Load all replaces the board. Team scores stay."
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
              disabled={!canSaveAll}
              onClick={onSaveAll}
              className={bankSaveClass}
            >
              Save all questions
            </button>
            <button
              type="button"
              disabled={questions.length === 0}
              onClick={() => setPendingLoadAll(true)}
              className={bankSaveClass}
            >
              Load all
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
                  {entry.answers
                    .map((answer) => `${answer.text.trim()} ${answer.points}`)
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
        message="This replaces the question on screen and hides its answers. The saved copy stays in the list."
        confirmLabel="Load"
        onConfirm={() => {
          if (pendingLoadId) onLoad(pendingLoadId);
        }}
      />
      <ConfirmDialog
        open={pendingLoadAll}
        onOpenChange={setPendingLoadAll}
        title="Load all questions"
        message="This replaces every question on the board and hides every answer. Team names and scores stay."
        confirmLabel="Load all"
        onConfirm={onLoadAll}
      />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete question"
        message="This removes the saved question. The board stays as it is."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
        }}
      />
    </>
  );
}
