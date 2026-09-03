"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { LiveDrawerToken } from "@/lib/live-drawer/types";
import {
  LIVE_DRAWER_COLORS,
  getLiveDrawerColor,
  liveDrawerFillStyle,
  liveDrawerOutlineClass,
} from "@/lib/live-drawer/types";

type HostessPoolModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokens: LiveDrawerToken[];
  onRemove: (tokenIds: string[]) => void;
};

function sortTokens(tokens: LiveDrawerToken[]): LiveDrawerToken[] {
  const colorOrder = new Map(LIVE_DRAWER_COLORS.map((c, i) => [c.id, i]));
  return [...tokens].sort((a, b) => {
    const ca = colorOrder.get(a.colorId) ?? 99;
    const cb = colorOrder.get(b.colorId) ?? 99;
    if (ca !== cb) return ca - cb;
    const na = Number(a.number);
    const nb = Number(b.number);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}

function tokenCircleClass(number: string): string {
  const digits = number.trim().length;
  if (digits >= 3) return "size-12 text-sm";
  if (digits === 2) return "size-12 text-lg";
  return "size-12 text-xl";
}

export function HostessPoolModal({
  open,
  onOpenChange,
  tokens,
  onRemove,
}: Readonly<HostessPoolModalProps>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const sorted = useMemo(() => sortTokens(tokens), [tokens]);
  const selectedCount = selectedIds.size;

  useEffect(() => {
    const valid = new Set(tokens.map((t) => t.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [tokens]);

  const toggleSelect = (tokenId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const handleRemove = () => {
    if (selectedIds.size === 0) return;
    onRemove([...selectedIds]);
    setSelectedIds(new Set());
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSelectedIds(new Set());
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-1000 bg-neutral-950" />
        <Dialog.Content className="fixed inset-0 z-1001 flex flex-col bg-neutral-950 text-neutral-100">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-4">
            <Dialog.Title className="text-lg font-bold text-white">
              Pool ({tokens.length})
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 pt-3 pb-28">
            {sorted.length === 0 ? (
              <p className="py-12 text-center text-neutral-500">Pool is empty</p>
            ) : (
              <ul className="flex flex-wrap content-start justify-center gap-x-3 gap-y-4 py-1">
                {sorted.map((t) => {
                  const color = getLiveDrawerColor(t.colorId);
                  const isSelected = selectedIds.has(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggleSelect(t.id)}
                        aria-pressed={isSelected}
                        title={`${color?.name ?? t.colorId} ${t.number}`}
                        className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums leading-none outline-none transition-transform active:scale-95 ${tokenCircleClass(t.number)} ${
                          isSelected
                            ? "ring-4 ring-sky-400 ring-offset-2 ring-offset-neutral-950"
                            : liveDrawerOutlineClass(color)
                        }`}
                        style={{
                          ...liveDrawerFillStyle(color),
                          fontFamily: "var(--font-oswald), Impact, sans-serif",
                          textShadow:
                            color?.ink === "#171717"
                              ? "none"
                              : "0 1px 2px rgba(0,0,0,0.45)",
                        }}
                      >
                        {t.number}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-1002 bg-neutral-950/95 p-4">
              <div className="mx-auto flex max-w-lg gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="flex-1 rounded-lg border border-neutral-700 py-3 font-semibold text-neutral-200"
                >
                  Clear ({selectedCount})
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex-1 rounded-lg bg-red-600 py-3 font-semibold text-white"
                >
                  Remove {selectedCount}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
