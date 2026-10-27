"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { bankHeaderSaveClass } from "@/components/operator/BankPanel";
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
import type { PriceCatalogItem } from "@/lib/price/catalog";
import { formatPrice } from "@/lib/price/format";
import { photoFitStyle } from "@/lib/price/photo-fit";

export function PriceItemLibrary({
  items,
  groups,
  saveLabel,
  saveDisabled,
  loadDisabled,
  pickHint,
  onSave,
  onLoad,
  onDelete,
  onQueue,
  onGroupsApply,
  openRequest = 0,
  closeOnLoad = false,
}: {
  items: PriceCatalogItem[];
  groups: ContentGroup[];
  saveLabel: string;
  saveDisabled?: boolean;
  loadDisabled?: boolean;
  pickHint: string;
  onSave: (groupId: string | null) => void | Promise<void>;
  onLoad: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  /** When set, each saved item also gets Add to upcoming. */
  onQueue?: (id: string) => void | Promise<void>;
  onGroupsApply: (next: {
    groups: ContentGroup[];
    items: PriceCatalogItem[];
  }) => void;
  openRequest?: number;
  closeOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const bankGroups = useBankGroups(groups, items, onGroupsApply);

  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  const run = async (work: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Tooltip content="Save and load items">
        <button
          type="button"
          aria-label="Save and load items"
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
            <div className="px-6 pt-6 pr-14 pb-4">
              <Dialog.Title className="text-lg font-semibold text-white">
                Saved items
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-400">
                Photos and names saved here work in Price is Tight and Price
                Order. {pickHint}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute top-4 right-4 rounded p-1 text-neutral-400 hover:bg-neutral-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
            {loadDisabled ? (
              <p className="px-6 pb-3 text-sm text-amber-200">
                The board already has five items. Remove one before adding
                another.
              </p>
            ) : null}
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
            <BankListHeader title="Items">
              <button
                type="button"
                disabled={saveDisabled || busy}
                onClick={() => void run(() => onSave(bankGroups.selectedGroupId))}
                className={bankHeaderSaveClass}
              >
                {saveLabel}
              </button>
            </BankListHeader>
            {items.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No saved items yet. Save the photo and name from the board.
              </p>
            ) : bankGroups.visible.length === 0 ? (
              <p className="px-6 py-6 text-sm text-neutral-500">
                No items in this group.
              </p>
            ) : (
              <ul className="grid min-h-0 flex-1 content-start grid-cols-2 gap-3 overflow-y-auto px-4 py-3 pb-6 sm:grid-cols-3">
                {bankGroups.visible.map((item) => {
                  const name = item.label.trim() || "Untitled item";
                  return (
                    <li key={item.id} className="relative">
                      <button
                        type="button"
                        disabled={busy || loadDisabled}
                        onClick={() =>
                          void run(async () => {
                            await onLoad(item.id);
                            if (closeOnLoad) setOpen(false);
                          })
                        }
                        className="flex w-full flex-col gap-2 rounded-xl border border-neutral-700 bg-neutral-800/70 p-2 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="relative block aspect-square overflow-hidden rounded-lg bg-neutral-950">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-full w-full"
                              style={photoFitStyle(item.photoFit)}
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                              No photo
                            </span>
                          )}
                        </span>
                        <span className="truncate px-1 text-sm font-semibold text-white">
                          {name}
                        </span>
                        <span className="px-1 text-xs font-semibold text-amber-300">
                          {formatPrice(item.price)}
                        </span>
                      </button>
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        <ChangeBankGroupButton
                          label={name}
                          onClick={() => bankGroups.openPicker(item.id)}
                          className="bg-neutral-950/80 text-neutral-200 hover:bg-neutral-900"
                        />
                        {onQueue ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              void run(() => onQueue(item.id));
                            }}
                            className="inline-flex h-11 items-center rounded-md bg-teal-700/90 px-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-40"
                          >
                            Queue
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingDeleteId(item.id)}
                          className="inline-flex h-11 items-center rounded-md bg-neutral-950/80 px-3 text-sm font-semibold text-neutral-200 hover:text-red-300 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            </BankGroupSplit>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteId(null);
        }}
        title="Delete item"
        message="This removes the saved item. The board stays as it is."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          void run(() => onDelete(id));
        }}
      />
      <BankGroupPicker
        open={bankGroups.pickerItem != null}
        onOpenChange={(next) => {
          if (!next) bankGroups.closePicker();
        }}
        description={bankGroups.pickerItem?.label.trim() || "Saved item"}
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
