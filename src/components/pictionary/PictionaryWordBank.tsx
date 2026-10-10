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
import type { PictionaryBankWord } from "@/lib/pictionary/types";

export function PictionaryWordBank({
  words,
  canSave,
  onSave,
  onLoad,
  onDelete,
}: {
  words: PictionaryBankWord[];
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
        title="Words"
        hint="Each saved row is a word or phrase. Load puts it on the board, closes the curtain, and resets the clock."
        empty="No saved words yet."
        actions={
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className={bankSaveClass}
          >
            Save this word
          </button>
        }
      >
        {words.length > 0
          ? words.map((entry) => (
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
                  {entry.word}
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
        title="Load word"
        message="This replaces the word on the board and closes the curtain."
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
        title="Delete word"
        message="This removes the saved word. The board stays as it is."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
        }}
      />
    </>
  );
}
