"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  BankPanel,
  BankRow,
  bankDeleteClass,
  bankHeaderSaveClass,
  bankLoadClass,
} from "@/components/operator/BankPanel";
import {
  BankListHeader,
  BankGroupColumn,
  BankGroupPicker,
  BankGroupSplit,
  ChangeBankGroupButton,
  useBankGroups,
} from "@/components/operator/BankGroups";
import type { ContentGroup } from "@/lib/content-bank";
import type { JeoparodyBankCategory } from "@/lib/jeoparody/types";

export function JeoparodyCategoryBank({
  categories,
  groups,
  canSave,
  onSaveAll,
  onLoad,
  onLoadAll,
  onDelete,
  onGroupsApply,
}: {
  categories: JeoparodyBankCategory[];
  groups: ContentGroup[];
  canSave: boolean;
  onSaveAll: (groupId: string | null) => void;
  onLoad: (id: string) => void;
  onLoadAll: () => void;
  onDelete: (id: string) => void;
  onGroupsApply: (next: {
    groups: ContentGroup[];
    items: JeoparodyBankCategory[];
  }) => void;
}) {
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingLoadAll, setPendingLoadAll] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const bankGroups = useBankGroups(groups, categories, onGroupsApply);

  return (
    <>
      <BankPanel
        title="Categories"
        hint="Each saved category keeps its clues, values, prompts, and responses. Load adds that category. Load all replaces the board. Contestant names and scores stay. Groups sort this list. Older saves stay ungrouped until you move them."
        empty="No saved categories yet."
        bare
      >
        <BankGroupSplit
          className="h-96 rounded-lg border border-neutral-800"
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
        <BankListHeader title="Categories">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSaveAll(bankGroups.selectedGroupId)}
            className={bankHeaderSaveClass}
          >
            Save all categories
          </button>
          <button
            type="button"
            disabled={categories.length === 0}
            onClick={() => setPendingLoadAll(true)}
            className={bankHeaderSaveClass}
          >
            Load all
          </button>
        </BankListHeader>
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-sm text-neutral-500">
              No saved categories yet.
            </p>
          ) : bankGroups.visible.length === 0 ? (
            <p className="px-3 py-4 text-sm text-neutral-500">
              No categories in this group.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto p-2">
              {bankGroups.visible.map((category) => (
              <BankRow
                key={category.id}
                actions={
                  <>
                    <ChangeBankGroupButton
                      label={category.name.trim() || "category"}
                      onClick={() => bankGroups.openPicker(category.id)}
                    />
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
              ))}
            </ul>
          )}
        </BankGroupSplit>
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
      <BankGroupPicker
        open={bankGroups.pickerItem != null}
        onOpenChange={(next) => {
          if (!next) bankGroups.closePicker();
        }}
        description={bankGroups.pickerItem?.name ?? ""}
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
