"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, FolderInput, FolderPlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  applyBankGroupChange,
  MAX_CONTENT_GROUP_NAME,
  MAX_CONTENT_GROUPS,
  type BankGroupChange,
  type ContentGroup,
} from "@/lib/content-bank";

export type BankGroupFilter = "all" | "ungrouped" | string;

export function useBankGroupFilter(groups: readonly ContentGroup[]) {
  const [filter, setFilter] = useState<BankGroupFilter>("all");

  useEffect(() => {
    if (
      filter !== "all" &&
      filter !== "ungrouped" &&
      !groups.some((group) => group.id === filter)
    ) {
      setFilter("all");
    }
  }, [filter, groups]);

  const selectedGroupId =
    filter !== "all" &&
    filter !== "ungrouped" &&
    groups.some((group) => group.id === filter)
      ? filter
      : null;

  const matches = (groupId: string | null | undefined) => {
    if (filter === "all") return true;
    if (filter === "ungrouped") return groupId == null;
    return groupId === filter;
  };

  return { filter, setFilter, selectedGroupId, matches };
}

export function useBankGroups<T extends { id: string; groupId: string | null }>(
  groups: readonly ContentGroup[],
  items: readonly T[],
  onApply: (next: { groups: ContentGroup[]; items: T[] }) => void,
) {
  const filterApi = useBankGroupFilter(groups);
  const [pickerId, setPickerId] = useState<string | null>(null);

  const apply = (change: BankGroupChange) => {
    const next = applyBankGroupChange(groups, items, change);
    if (change.type === "move") setPickerId(null);
    if (!next.changed) return;
    onApply({ groups: next.groups, items: next.items });
    if (change.type === "add" && next.focusGroupId) {
      filterApi.setFilter(next.focusGroupId);
    }
    if (change.type === "delete") filterApi.setFilter("ungrouped");
  };

  const visible = items.filter((item) => filterApi.matches(item.groupId));
  const pickerItem = items.find((item) => item.id === pickerId) ?? null;

  return {
    ...filterApi,
    visible,
    pickerId,
    pickerItem,
    openPicker: (id: string) => setPickerId(id),
    closePicker: () => setPickerId(null),
    addGroup: (name: string) => apply({ type: "add", name }),
    renameGroup: (id: string, name: string) => apply({ type: "rename", id, name }),
    deleteGroup: (id: string) => apply({ type: "delete", id }),
    moveItem: (itemId: string, groupId: string | null) =>
      apply({ type: "move", itemId, groupId }),
  };
}

const groupButtonClass = (selected: boolean) =>
  `h-11 w-full min-w-0 shrink-0 truncate rounded-md px-2.5 text-left text-sm font-semibold ${
    selected
      ? "bg-sky-600 text-white"
      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
  }`;

export function BankGroupColumn({
  groups,
  filter,
  onFilter,
  onAdd,
  onRename,
  onDelete,
}: {
  groups: readonly ContentGroup[];
  filter: BankGroupFilter;
  onFilter: (filter: BankGroupFilter) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ContentGroup | null>(null);
  const skipRenameRef = useRef(false);
  const atLimit = groups.length >= MAX_CONTENT_GROUPS;

  const cancelAdd = () => {
    setDraft("");
    setAdding(false);
  };

  const submitAdd = () => {
    const name = draft.trim();
    setDraft("");
    setAdding(false);
    if (!name || atLimit) return;
    onAdd(name);
  };

  const submitRename = (id: string) => {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name) return;
    onRename(id, name);
  };

  return (
    <>
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-800">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-neutral-800 px-3">
        <h3 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          Groups
        </h3>
        <button
          type="button"
          aria-label="Add group"
          title="Add group"
          disabled={atLimit}
          onClick={() => {
            setDraft("");
            setAdding(true);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
        >
          <FolderPlus size={18} aria-hidden />
        </button>
      </div>
      {adding ? (
        <form
          className="border-b border-neutral-800 p-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitAdd();
          }}
        >
          <input
            value={draft}
            autoFocus
            aria-label="Group name"
            placeholder="Group name"
            onChange={(event) =>
              setDraft(event.target.value.slice(0, MAX_CONTENT_GROUP_NAME))
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelAdd();
              }
            }}
            className="h-8 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={cancelAdd}
              className="h-8 flex-1 rounded-md border border-neutral-700 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!draft.trim() || atLimit}
              className="h-8 flex-1 rounded-md bg-sky-600 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
            >
              Add group
            </button>
          </div>
        </form>
      ) : null}
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2">
        <button
          type="button"
          onClick={() => onFilter("all")}
          className={groupButtonClass(filter === "all")}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onFilter("ungrouped")}
          className={groupButtonClass(filter === "ungrouped")}
        >
          Ungrouped
        </button>
        {groups.map((group) => {
          const selected = filter === group.id;
          return (
            <div key={group.id} className="flex h-11 shrink-0 items-center gap-1">
              {renamingId === group.id ? (
                <input
                  value={renameDraft}
                  aria-label="Rename group"
                  autoFocus
                  onChange={(event) =>
                    setRenameDraft(
                      event.target.value.slice(0, MAX_CONTENT_GROUP_NAME),
                    )
                  }
                  onBlur={() => {
                    if (skipRenameRef.current) {
                      skipRenameRef.current = false;
                      return;
                    }
                    submitRename(group.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitRename(group.id);
                    }
                    if (event.key === "Escape") {
                      skipRenameRef.current = true;
                      setRenamingId(null);
                    }
                  }}
                  className="h-11 min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  title="Double-click to rename"
                  onClick={() => onFilter(group.id)}
                  onDoubleClick={() => {
                    setRenamingId(group.id);
                    setRenameDraft(group.name);
                  }}
                  className={`${groupButtonClass(selected)} flex-1`}
                >
                  {group.name}
                </button>
              )}
              {selected && renamingId !== group.id ? (
                <button
                  type="button"
                  aria-label={`Delete ${group.name}`}
                  title="Delete group"
                  onClick={() => setPendingDelete(group)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
    <ConfirmDialog
      open={pendingDelete != null}
      onOpenChange={(open) => {
        if (!open) setPendingDelete(null);
      }}
      title="Delete group"
      message={
        pendingDelete
          ? `Delete "${pendingDelete.name}"? Everything in it goes back to Ungrouped.`
          : ""
      }
      confirmLabel="Delete"
      variant="danger"
      onConfirm={() => {
        if (pendingDelete) onDelete(pendingDelete.id);
      }}
    />
    </>
  );
}

/** Same size for every save dialog, including an empty group. */
export const bankDialogClass =
  "fixed top-1/2 left-1/2 z-[1001] flex h-[min(82vh,780px)] w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl";

export function BankListHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-neutral-800 px-3">
      <h3 className="shrink-0 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        {title}
      </h3>
      {children ? (
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function BankGroupSplit({
  className = "",
  sidebar,
  children,
}: {
  className?: string;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-h-0 flex-1 border-t border-neutral-800 ${className}`}>
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function ChangeBankGroupButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Change group for ${label}`}
      title="Change group"
      onClick={onClick}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white ${className}`}
    >
      <FolderInput size={18} />
    </button>
  );
}

export function BankGroupPicker({
  open,
  onOpenChange,
  description,
  groups,
  groupId,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  groups: readonly ContentGroup[];
  groupId: string | null;
  onChoose: (groupId: string | null) => void;
}) {
  const current = groupId ?? "ungrouped";
  const options = [
    { value: "ungrouped", label: "Ungrouped" },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1100] bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[1101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="m-0 text-lg font-semibold text-neutral-200">
                Choose group
              </Dialog.Title>
              <Dialog.Description className="mt-1 truncate text-sm text-neutral-400">
                {description || "Saved item"}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex max-h-72 flex-col gap-1 overflow-auto">
            {options.map((option) => {
              const selected = option.value === current;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChoose(option.value === "ungrouped" ? null : option.value)
                  }
                  className={`flex h-11 items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm font-semibold ${
                    selected
                      ? "bg-sky-600 text-white"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected ? <Check size={14} aria-hidden /> : null}
                </button>
              );
            })}
          </div>
          {groups.length === 0 ? (
            <p className="mt-3 text-xs text-neutral-500">
              Add a group from the Groups list first.
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
