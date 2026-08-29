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
import { HostessPoolModal } from "@/components/hostess/HostessPoolModal";
import { HostessNumberPad } from "@/components/hostess/HostessNumberPad";

const LOG_SLOTS = 5;

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

  const serverRecent = useMemo(
    () => poolTokens.slice(0, LOG_SLOTS),
    [poolTokens],
  );

  useEffect(() => {
    setRecentLine(serverRecent);
    setPoolCountBump(0);
  }, [serverRecent]);

  const displayPoolCount = poolTokens.length + poolCountBump;

  const handleAdd = () => {
    const n = number.trim();
    if (!n) return;

    const optimistic = createOptimisticToken(n, colorId);
    setRecentLine((prev) => [optimistic, ...prev].slice(0, LOG_SLOTS));
    setPoolCountBump((b) => b + 1);
    setNumber("");
    setMessage("Added");

    void (async () => {
      const revert = () => {
        setRecentLine((prev) => prev.filter((t) => t.id !== optimistic.id));
        setPoolCountBump((b) => Math.max(0, b - 1));
      };

      try {
        const res = await fetch("/api/tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokens: [{ number: n, colorId }] }),
        });
        const data = (await res.json()) as {
          error?: string;
          added?: number;
          skipped?: number;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to add");
        if ((data.skipped ?? 0) > 0) {
          revert();
          setMessage("Already in pool");
          return;
        }
        void refreshSnapshot();
      } catch (e) {
        revert();
        setMessage(e instanceof Error ? e.message : "Failed");
      }
    })();
  };

  const handleRemove = async (tokenId: string) => {
    const res = await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to remove");
    await refreshSnapshot();
  };

  const messageClass =
    message === "Added"
      ? "text-emerald-400"
      : message
        ? "text-amber-300"
        : "text-transparent";

  const slots = Array.from({ length: LOG_SLOTS }, (_, i) => recentLine[i] ?? null);
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
              className="truncate text-5xl font-bold tracking-wider tabular-nums"
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

          <p className={`h-3.5 text-center text-[11px] font-medium ${messageClass}`}>
            {message || "—"}
          </p>

          <div className="flex h-16 flex-col pt-1">
            <div className="flex h-4 shrink-0 items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                Last added
              </p>
              <button
                type="button"
                onClick={() => setPoolOpen(true)}
                className="text-[11px] font-medium text-sky-400 hover:text-sky-300"
              >
                Pool ({displayPoolCount})
              </button>
            </div>
            <ul className="mt-1 flex min-h-0 flex-1 items-center gap-1">
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
                    className={`flex h-6 min-w-0 flex-1 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${liveDrawerOutlineClass(color)}`}
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
        tokens={poolTokens}
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
