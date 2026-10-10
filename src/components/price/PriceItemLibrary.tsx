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
import type { PriceCatalogItem } from "@/lib/price/catalog";
import { formatPrice } from "@/lib/price/format";

export function PriceItemLibrary({
  items,
  saveLabel,
  saveDisabled,
  loadDisabled,
  hint,
  loadMessage = "This puts the saved item on the board. The saved copy stays in the list.",
  deleteMessage = "This removes the saved item. The board stays as it is.",
  onSave,
  onLoad,
  onDelete,
}: {
  items: PriceCatalogItem[];
  saveLabel: string;
  saveDisabled?: boolean;
  loadDisabled?: boolean;
  hint: string;
  loadMessage?: string;
  deleteMessage?: string;
  onSave: () => void | Promise<void>;
  onLoad: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      <BankPanel
        title="Saved items"
        hint={hint}
        empty="No saved items yet."
        actions={
          <button
            type="button"
            disabled={saveDisabled || busy}
            onClick={() => void run(onSave)}
            className={bankSaveClass}
          >
            {saveLabel}
          </button>
        }
      >
        {items.length > 0
          ? items.map((item) => (
              <BankRow
                key={item.id}
                actions={
                  <>
                    <button
                      type="button"
                      disabled={busy || loadDisabled}
                      onClick={() => setPendingLoadId(item.id)}
                      className={bankLoadClass}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingDeleteId(item.id)}
                      className={bankDeleteClass}
                    >
                      Delete
                    </button>
                  </>
                }
              >
                <div className="flex items-center gap-2">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-neutral-800 text-[10px] text-neutral-500">
                      No photo
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-100">
                      {item.label.trim() || "Untitled item"}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
              </BankRow>
            ))
          : null}
      </BankPanel>
      <ConfirmDialog
        open={pendingLoadId != null}
        onOpenChange={(open) => {
          if (!open) setPendingLoadId(null);
        }}
        title="Load item"
        message={loadMessage}
        confirmLabel="Load"
        onConfirm={() => {
          const id = pendingLoadId;
          if (!id) return;
          void run(() => onLoad(id));
        }}
      />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete item"
        message={deleteMessage}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          void run(() => onDelete(id));
        }}
      />
    </>
  );
}
