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
import type { JeoparodyBankCategory } from "@/lib/jeoparody/types";

export function JeoparodyCategoryBank({
  categories,
  canSave,
  onSaveAll,
  onLoad,
  onLoadAll,
  onDelete,
}: {
  categories: JeoparodyBankCategory[];
  canSave: boolean;
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
        title="Categories"
        hint="Each saved category keeps its clues, values, prompts, and responses. Load adds that category. Load all replaces the board. Contestant names and scores stay."
        empty="No saved categories yet."
        actions={
          <>
            <button
              type="button"
              disabled={!canSave}
              onClick={onSaveAll}
              className={bankSaveClass}
            >
              Save all categories
            </button>
            <button
              type="button"
              disabled={categories.length === 0}
              onClick={() => setPendingLoadAll(true)}
              className={bankSaveClass}
            >
              Load all
            </button>
          </>
        }
      >
        {categories.length > 0
          ? categories.map((category) => (
              <BankRow
                key={category.id}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setPendingLoadId(category.id)}
                      className={bankLoadClass}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(category.id)}
                      className={bankDeleteClass}
                    >
                      Delete
                    </button>
                  </>
                }
              >
                <p className="truncate text-sm font-semibold text-neutral-100">
                  {category.name.trim() || "(no name)"}
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {category.clues.map((clue, index) => (
                    <li
                      key={`${category.id}-${index}`}
                      className="truncate text-xs text-neutral-400"
                    >
                      {clue.value} · {clue.prompt.trim() || "(no prompt)"} —{" "}
                      {clue.response.trim() || "(no response)"}
                    </li>
                  ))}
                </ul>
              </BankRow>
            ))
          : null}
      </BankPanel>
      <ConfirmDialog
        open={pendingLoadId != null}
        onOpenChange={(open) => {
          if (!open) setPendingLoadId(null);
        }}
        title="Load category"
        message="This adds the category to the board with every clue unplayed."
        confirmLabel="Load"
        onConfirm={() => {
          if (pendingLoadId) onLoad(pendingLoadId);
        }}
      />
      <ConfirmDialog
        open={pendingLoadAll}
        onOpenChange={setPendingLoadAll}
        title="Load all categories"
        message="This replaces the board and marks every clue unplayed. Contestant names and scores stay."
        confirmLabel="Load all"
        onConfirm={onLoadAll}
      />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete category"
        message="This removes the saved category. The board stays as it is."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
        }}
      />
    </>
  );
}
