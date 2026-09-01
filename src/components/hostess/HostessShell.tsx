"use client";

import { useEffect, useMemo, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import { PinGate } from "@/components/auth/PinGate";
import {
  LIVE_DRAWER_COLORS,
  getLiveDrawerColor,
  liveDrawerFillStyle,
  liveDrawerNeedsLightSurface,
  liveDrawerOutlineClass,
  type LiveDrawerToken,
} from "@/lib/live-drawer/types";
import { parseNumberRange } from "@/lib/live-drawer/draw";
import { HostessPoolModal } from "@/components/hostess/HostessPoolModal";
import { HostessNumberPad } from "@/components/hostess/HostessNumberPad";

const LOG_SLOTS = 10;

function createOptimisticToken(number: string, colorId: string): LiveDrawerToken {
  return {
    id: `opt-${crypto.randomUUID()}`,
    number,
    colorId,
  };
}

function HostessContent() {
  const { poolTokens, refreshSnapshot } = useSuite();
  const [number, setNumber] = useState("");
  const [colorId, setColorId] = useState("blue");
  const [message, setMessage] = useState("");
  const [poolOpen, setPoolOpen] = useState(false);
  const [recentLine, setRecentLine] = useState<LiveDrawerToken[]>([]);
  const [poolCountBump, setPoolCountBump] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const serverRecent = useMemo(
    () => poolTokens.slice(0, LOG_SLOTS),
    [poolTokens],
  );

  useEffect(() => {
    setRecentLine(serverRecent);
    setPoolCountBump(0);
  }, [serverRecent]);

  useEffect(() => {
    const serverIds = new Set(poolTokens.map((t) => t.id));
    setHiddenIds((prev) => {
      const next = new Set([...prev].filter((id) => serverIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [poolTokens]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const visibleTokens = useMemo(
    () => poolTokens.filter((t) => !hiddenIds.has(t.id)),
    [poolTokens, hiddenIds],
  );
  const displayPoolCount = visibleTokens.length + poolCountBump;

  const handleAdd = () => {
    const numbers = parseNumberRange(number);
    if (numbers.length === 0) {
      if (number.trim()) setMessage("Use 1,2,3 or a range like 1-10");
      return;
    }

    const optimistic = numbers.map((n) => createOptimisticToken(n, colorId));
    const optimisticIds = new Set(optimistic.map((t) => t.id));
    setRecentLine((prev) => [...optimistic, ...prev].slice(0, LOG_SLOTS));
    setPoolCountBump((b) => b + numbers.length);
    setNumber("");
    setMessage(numbers.length === 1 ? "Added" : `Added ${numbers.length}`);

    void (async () => {
      const revert = () => {
        setRecentLine((prev) => prev.filter((t) => !optimisticIds.has(t.id)));
        setPoolCountBump((b) => Math.max(0, b - numbers.length));
      };

      try {
        const res = await fetch("/api/tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokens: numbers.map((n) => ({ number: n, colorId })),
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          added?: number;
          skipped?: number;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to add");
        const added = data.added ?? 0;
        const skipped = data.skipped ?? 0;
        if (added === 0 && skipped > 0) {
          revert();
          setMessage("Already in pool");
          return;
        }
        if (skipped > 0) {
          setMessage(`Added ${added}, skipped ${skipped}`);
        }
        void refreshSnapshot();
      } catch (e) {
        revert();
        setMessage(e instanceof Error ? e.message : "Failed");
      }
    })();
  };

  const handleRemove = (tokenIds: string[]) => {
    if (tokenIds.length === 0) return;

    const idSet = new Set(tokenIds);
    const removedTokens = tokenIds
      .map(
        (id) =>
          poolTokens.find((t) => t.id === id) ??
          recentLine.find((t) => t.id === id),
      )
      .filter((t): t is LiveDrawerToken => Boolean(t));

    setHiddenIds((prev) => {
      const next = new Set(prev);
      for (const id of tokenIds) next.add(id);
      return next;
    });
    setRecentLine((prev) => prev.filter((t) => !idSet.has(t.id)));
    setMessage(tokenIds.length === 1 ? "Removed" : `Removed ${tokenIds.length}`);

    void (async () => {
      const failedIds: string[] = [];
      await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const res = await fetch(`/api/tokens/${tokenId}`, {
              method: "DELETE",
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(data.error ?? "Failed to remove");
          } catch {
            failedIds.push(tokenId);
          }
        }),
      );

      if (failedIds.length === 0) {
        void refreshSnapshot();
        return;
      }

      const failedSet = new Set(failedIds);
      setHiddenIds((prev) => {
        const next = new Set(prev);
        for (const id of failedIds) next.delete(id);
        return next;
      });
      const restored = removedTokens.filter((t) => failedSet.has(t.id));
      if (restored.length > 0) {
        setRecentLine((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          const toAdd = restored.filter((t) => !existing.has(t.id));
          return [...toAdd, ...prev].slice(0, LOG_SLOTS);
        });
      }
      const removed = tokenIds.length - failedIds.length;
      setMessage(
        removed > 0
          ? `Removed ${removed}, failed ${failedIds.length}`
          : "Failed",
      );
      void refreshSnapshot();
    })();
  };

  const messageClass =
    message === "Added" ||
    message.startsWith("Added ") ||
    message === "Removed" ||
    message.startsWith("Removed ")
      ? "text-emerald-400"
      : message
        ? "text-amber-300"
        : "text-transparent";

  const slots = Array.from(
    { length: LOG_SLOTS },
    (_, i) => recentLine.filter((t) => !hiddenIds.has(t.id))[i] ?? null,
  );
  const selectedColor = getLiveDrawerColor(colorId);
  const lightEntry = selectedColor
    ? liveDrawerNeedsLightSurface(selectedColor.hex)
    : false;
  const entryColor = number
    ? (selectedColor?.hex ?? "#ffffff")
    : "#737373";

  return (
    <>
      <div className="hostess-screen mx-auto flex w-full max-w-lg flex-col bg-neutral-950 text-neutral-100">
        <div className="hostess-chrome shrink-0 pb-2">
          <div
            className={`flex h-16 items-center justify-center rounded-lg border px-4 ${
              lightEntry
                ? "border-neutral-400 bg-neutral-100"
                : "border-neutral-600 bg-neutral-900"
            }`}
            aria-live="polite"
            aria-label="Number entry"
          >
            <span
              className={`truncate font-bold tabular-nums ${
                number.length > 8
                  ? "text-3xl tracking-wide"
                  : "text-5xl tracking-wider"
              }`}
              style={{ color: entryColor }}
            >
              {number || "—"}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <HostessNumberPad value={number} onChange={setNumber} />
        </div>

        <div className="hostess-chrome flex shrink-0 flex-col gap-2 pt-2">
          <div className="grid grid-cols-4 justify-items-center gap-3 py-1">
            {LIVE_DRAWER_COLORS.map((c) => {
              const selected = colorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  className={`size-12 rounded-full shadow-md transition-transform active:scale-95 ${
                    selected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-950"
                      : liveDrawerOutlineClass(c)
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={c.name}
                  aria-pressed={selected}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!number.trim()}
            className="rounded-lg bg-sky-600 py-4 text-lg font-bold text-white disabled:opacity-40"
          >
            Add
          </button>

          <div className="flex flex-col pt-1">
            <div className="flex h-4 shrink-0 items-center gap-2">
              <p className="shrink-0 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                Last added
              </p>
              <p
                className={`min-w-0 flex-1 truncate text-center text-[11px] font-medium ${messageClass}`}
                aria-live="polite"
              >
                {message || "—"}
              </p>
              <button
                type="button"
                onClick={() => setPoolOpen(true)}
                className="shrink-0 text-[11px] font-medium text-sky-400 hover:text-sky-300"
              >
                Pool ({displayPoolCount})
              </button>
            </div>
            <ul className="mt-1 flex items-center gap-1">
              {slots.map((t, i) => {
                if (!t) {
                  return (
                    <li
                      key={`empty-${i}`}
                      className="h-6 min-w-0 flex-1 rounded-full border border-dashed border-neutral-800/80"
                      aria-hidden
                    />
                  );
                }
                const color = getLiveDrawerColor(t.colorId);
                return (
                  <li
                    key={t.id}
                    className={`flex h-6 min-w-0 flex-1 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums ${liveDrawerOutlineClass(color)}`}
                    style={liveDrawerFillStyle(color)}
                    title={`${color?.name} ${t.number}`}
                  >
                    {t.number}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <HostessPoolModal
        open={poolOpen}
        onOpenChange={setPoolOpen}
        tokens={visibleTokens}
        onRemove={handleRemove}
      />
    </>
  );
}

export function HostessShell() {
  return (
    <PinGate role="hostess" title="Hostess">
      <SuiteProvider role="hostess">
        <HostessContent />
      </SuiteProvider>
    </PinGate>
  );
}
