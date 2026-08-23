"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { LiveDrawerToken } from "@/lib/live-drawer/types";
import {
  LIVE_DRAWER_COLORS,
  getLiveDrawerColor,
} from "@/lib/live-drawer/types";

type HostessPoolModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokens: LiveDrawerToken[];
  onRemove: (tokenId: string) => Promise<void>;
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

export function HostessPoolModal({
  open,
  onOpenChange,
  tokens,
  onRemove,
}: Readonly<HostessPoolModalProps>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const sorted = useMemo(() => sortTokens(tokens), [tokens]);
  const selected = tokens.find((t) => t.id === selectedId);

  const handleRemove = async () => {
    if (!selectedId) return;
    setRemoving(true);
    try {
      await onRemove(selectedId);
      setSelectedId(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSelectedId(null);
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

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-28">
            {sorted.length === 0 ? (
              <p className="py-12 text-center text-neutral-500">Pool is empty</p>
            ) : (
              <ul className="grid grid-cols-5 gap-x-2 gap-y-4">
                {sorted.map((t) => {
                  const color = getLiveDrawerColor(t.colorId);
                  const isSelected = selectedId === t.id;
                  return (
                    <li key={t.id} className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId(isSelected ? null : t.id)
                        }
                        aria-pressed={isSelected}
                        className={`flex aspect-square w-full items-center justify-center rounded-lg text-3xl font-bold tabular-nums transition-transform active:scale-95 ${
                          isSelected
                            ? "bg-neutral-800 ring-2 ring-white"
                            : "hover:bg-neutral-900"
                        }`}
                        style={{
                          color: color?.hex,
                          fontFamily:
                            "var(--font-oswald), Impact, sans-serif",
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

          {selected && (
            <div className="fixed inset-x-0 bottom-0 z-1002 bg-neutral-950/95 p-4">
              <div className="mx-auto flex max-w-lg gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex-1 rounded-lg border border-neutral-700 py-3 font-semibold text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={removing}
                  className="flex-1 rounded-lg bg-red-600 py-3 font-semibold text-white disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
