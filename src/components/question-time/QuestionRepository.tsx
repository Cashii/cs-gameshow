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
import {
  DEFAULT_QUESTION_TIME_TITLE,
  type QuestionTimeBankEntry,
} from "@/lib/question-time/types";

export function QuestionRepository({
  entries,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onUpdate,
}: {
  entries: QuestionTimeBankEntry[];
  canSave: boolean;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { title: string; question: string }) => void;
}) {
  const [drafts, setDrafts] = useState(entries);
  const [source, setSource] = useState(entries);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      <BankPanel
        title="Question repository"
        hint="Each row is a question you can reuse. Load replaces the title and question on screen and leaves teams, scores, and the clock alone."
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
        {drafts.length > 0
          ? drafts.map((entry) => (
              <BankRow
                key={entry.id}
                actions={
                  <>
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
                      className={bankDeleteClass}
                    >
                      Delete
                    </button>
                  </>
                }
              >
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
                  className="mb-1 h-8 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
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
        message="This replaces the title and question on screen. Teams, scores, and the clock stay."
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
        message="This removes the saved question. The question on screen stays."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
        }}
      />
    </>
  );
}
