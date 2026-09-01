"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  LIVE_DRAWER_COLORS,
  getLiveDrawerColor,
  liveDrawerFillStyle,
  liveDrawerOutlineClass,
  type LiveDrawerColor,
} from "@/lib/live-drawer/types";
import {
  clampColorCount,
  parseNumberRange,
  validateColorDrawRequests,
} from "@/lib/live-drawer/draw";
import { Toast, useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { EventSnapshot } from "@/lib/suite-state";

function snapshotWithAddedTokens(
  snapshot: EventSnapshot,
  entries: { id: string; number: string; colorId: string }[],
): EventSnapshot {
  const poolKeys = new Set(
    snapshot.poolTokens.map((token) => `${token.colorId}:${token.number}`),
  );
  const calledByKey = new Map(
    snapshot.calledTokens.map((token) => [
      `${token.colorId}:${token.number}`,
      token,
    ]),
  );
  const poolSummary = { ...snapshot.poolSummary };
  const toPool: EventSnapshot["poolTokens"] = [];
  let calledTokens = snapshot.calledTokens;

  for (const entry of entries) {
    const key = `${entry.colorId}:${entry.number}`;
    if (poolKeys.has(key)) continue;
    poolKeys.add(key);

    const called = calledByKey.get(key);
    if (called) {
      calledTokens = calledTokens.filter((token) => token.id !== called.id);
      toPool.push(called);
    } else {
      toPool.push({
        id: entry.id,
        number: entry.number,
        colorId: entry.colorId,
      });
    }
    poolSummary[entry.colorId] = (poolSummary[entry.colorId] ?? 0) + 1;
  }

  if (toPool.length === 0) return snapshot;

  return {
    ...snapshot,
    poolTokens: [...snapshot.poolTokens, ...toPool],
    calledTokens,
    poolSummary,
  };
}

function snapshotWithoutToken(
  snapshot: EventSnapshot,
  tokenId: string,
): EventSnapshot {
  const inPool = snapshot.poolTokens.some((token) => token.id === tokenId);
  const removed =
    snapshot.poolTokens.find((token) => token.id === tokenId) ??
    snapshot.calledTokens.find((token) => token.id === tokenId);
  const poolSummary = { ...snapshot.poolSummary };
  if (inPool && removed) {
    poolSummary[removed.colorId] = Math.max(
      0,
      (poolSummary[removed.colorId] ?? 1) - 1,
    );
  }
  return {
    ...snapshot,
    poolTokens: snapshot.poolTokens.filter((token) => token.id !== tokenId),
    calledTokens: snapshot.calledTokens.filter((token) => token.id !== tokenId),
    poolSummary,
    liveDrawer: {
      ...snapshot.liveDrawer,
      revealedTokens: snapshot.liveDrawer.revealedTokens.filter(
        (token) => token.id !== tokenId,
      ),
    },
  };
}

function addTokensSummary(
  added: number,
  skipped: number,
  restored: number,
): string {
  const parts = [`Added ${added}`];
  if (restored > 0) {
    parts.push(
      `returned ${restored} called number${restored === 1 ? "" : "s"} to the pool`,
    );
  }
  if (skipped > 0) {
    parts.push(`skipped ${skipped} already in pool`);
  }
  return parts.join(", ");
}

function revealedChipClass(number: string): string {
  const digits = number.trim().length;
  if (digits >= 3) return "h-14 min-w-14 px-1 text-base";
  if (digits === 2) return "h-14 min-w-14 px-1 text-xl";
  return "h-14 min-w-14 text-2xl";
}

function summaryTokenClass(number: string): string {
  const digits = number.trim().length;
  if (digits >= 3) return "size-14 text-base";
  if (digits === 2) return "size-12 text-lg";
  return "size-12 text-xl";
}

function summaryTokenStyle(color: LiveDrawerColor): CSSProperties {
  return {
    ...liveDrawerFillStyle(color),
    fontFamily: "var(--font-oswald), Impact, sans-serif",
    textShadow: color.ink === "#171717" ? "none" : "0 1px 2px rgba(0, 0, 0, 0.45)",
  };
}

export function LiveDrawerHostPanel() {
  const {
    state,
    snapshot,
    poolSummary,
    poolTokens,
    calledTokens,
    refreshSnapshot,
    applyServerSnapshot,
  } = useSuite();
  const { toastMessage, showToast } = useToast();
  const [colorCounts, setColorCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [addNumber, setAddNumber] = useState("");
  const [addColorId, setAddColorId] = useState<string | null>("blue");
  const [listTab, setListTab] = useState<"pool" | "called">("pool");
  const [clearPoolOpen, setClearPoolOpen] = useState(false);
  const [returnCalledOpen, setReturnCalledOpen] = useState(false);
  const [clearCalledOpen, setClearCalledOpen] = useState(false);
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(() => new Set());
  const addInFlightRef = useRef(false);
  const seenPoolKeysRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    setColorCounts((prev) => {
      const next: Record<string, number> = {};
      let changed = false;
      for (const c of LIVE_DRAWER_COLORS) {
        const clamped = clampColorCount(c.id, prev[c.id] ?? 0, poolSummary);
        next[c.id] = clamped;
        if (clamped !== (prev[c.id] ?? 0)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [poolSummary]);

  useEffect(() => {
    if (!snapshot) return;

    const nextKeys = new Set(
      poolTokens.map((token) => `${token.colorId}:${token.number}`),
    );

    if (seenPoolKeysRef.current === null) {
      seenPoolKeysRef.current = nextKeys;
      return;
    }

    const seen = seenPoolKeysRef.current;
    const newcomers = poolTokens.filter(
      (token) => !seen.has(`${token.colorId}:${token.number}`),
    );
    seenPoolKeysRef.current = nextKeys;

    if (newcomers.length === 0) return;

    setListTab("pool");
    const newIds = newcomers.map((token) => token.id);
    setArrivingIds((prev) => {
      const merged = new Set(prev);
      for (const id of newIds) merged.add(id);
      return merged;
    });

    const timer = window.setTimeout(() => {
      setArrivingIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.delete(id);
        return next.size === prev.size ? prev : next;
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [snapshot, poolTokens]);

  const poolRows = useMemo(() => {
    const byColor = new Map<string, typeof poolTokens>();
    for (const token of poolTokens) {
      const list = byColor.get(token.colorId) ?? [];
      list.push(token);
      byColor.set(token.colorId, list);
    }
    return LIVE_DRAWER_COLORS.map((color) => {
      const tokens = (byColor.get(color.id) ?? []).sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      );
      return { color, tokens };
    }).filter((row) => row.tokens.length > 0);
  }, [poolTokens]);

  const calledRows = useMemo(() => {
    const byColor = new Map<string, typeof calledTokens>();
    for (const token of calledTokens) {
      const list = byColor.get(token.colorId) ?? [];
      list.push(token);
      byColor.set(token.colorId, list);
    }
    return LIVE_DRAWER_COLORS.map((color) => {
      const tokens = (byColor.get(color.id) ?? []).sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      );
      return { color, tokens };
    }).filter((row) => row.tokens.length > 0);
  }, [calledTokens]);

  const revealed = state.liveDrawer.revealedTokens;

  const runAction = async (body: Record<string, unknown>) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/live-drawer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setSelectedIds(new Set());
      await refreshSnapshot();
      return true;
    } catch (e) {
      const text = e instanceof Error ? e.message : "Failed";
      setMessage(text);
      showToast(text);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setColorDrawCount = (colorId: string, colorName: string, raw: number) => {
    const available = poolSummary[colorId] ?? 0;
    if (available === 0 && raw > 0) {
      showToast(`No ${colorName} tokens in the pool`);
      setColorCounts((prev) => ({ ...prev, [colorId]: 0 }));
      return;
    }
    if (raw > available) {
      showToast(
        `Only ${available} ${colorName} token${available === 1 ? "" : "s"} in the pool`,
      );
    }
    setColorCounts((prev) => ({
      ...prev,
      [colorId]: clampColorCount(colorId, raw, poolSummary),
    }));
  };

  const handleRandomDraw = () => {
    const requests = LIVE_DRAWER_COLORS.map((c) => ({
      colorId: c.id,
      count: colorCounts[c.id] ?? 0,
    })).filter((r) => r.count > 0);

    const error = validateColorDrawRequests(requests, poolSummary);
    if (error) {
      showToast(error);
      return;
    }
    void runAction({ action: "draw", colorCounts: requests });
  };

  const handleSelectedDraw = () => {
    if (selectedIds.size === 0) {
      showToast("Select tokens to draw");
      return;
    }
    void runAction({ action: "draw", tokenIds: [...selectedIds] });
  };

  const postTokens = async (
    tokens: { number: string; colorId: string }[],
  ) => {
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
    });
    const data = (await res.json()) as {
      error?: string;
      added?: number;
      skipped?: number;
      restored?: number;
      snapshot?: EventSnapshot;
    };
    if (!res.ok) throw new Error(data.error ?? "Failed");
    if (data.snapshot) applyServerSnapshot(data.snapshot);
    else await refreshSnapshot();
    return data;
  };

  const handleAddToken = async () => {
    if (!addColorId || addInFlightRef.current) return;
    const numbers = parseNumberRange(addNumber);
    if (numbers.length === 0) {
      if (addNumber.trim()) {
        const text = "Enter numbers or a range like 1-10";
        setMessage(text);
        showToast(text);
      }
      return;
    }
    const entries = numbers.map((number) => ({
      id: `opt-${crypto.randomUUID()}`,
      number,
      colorId: addColorId,
    }));
    const previous = snapshot;
    if (previous) {
      applyServerSnapshot(snapshotWithAddedTokens(previous, entries));
    }
    setAddNumber("");
    setListTab("pool");
    addInFlightRef.current = true;
    try {
      const data = await postTokens(
        numbers.map((number) => ({ number, colorId: addColorId })),
      );
      const added = data.added ?? 0;
      const skipped = data.skipped ?? 0;
      const restored = data.restored ?? 0;
      if (numbers.length > 1 || skipped > 0 || restored > 0) {
        const summary = addTokensSummary(added, skipped, restored);
        setMessage(summary);
        showToast(summary);
      }
    } catch (e) {
      if (previous) applyServerSnapshot(previous);
      const text = e instanceof Error ? e.message : "Failed";
      setMessage(text);
      showToast(text);
    } finally {
      addInFlightRef.current = false;
    }
  };

  const handleClearPool = async () => {
    const count = poolTokens.length;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/tokens", { method: "DELETE" });
      const data = (await res.json()) as {
        error?: string;
        snapshot?: EventSnapshot;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to clear pool");
      setSelectedIds(new Set());
      if (data.snapshot) applyServerSnapshot(data.snapshot);
      else await refreshSnapshot();
      const summary = `Cleared ${count} token${count === 1 ? "" : "s"} from the pool`;
      setMessage(summary);
      showToast(summary);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Failed";
      setMessage(text);
      showToast(text);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnCalled = async () => {
    const count = calledTokens.length;
    const ok = await runAction({ action: "return" });
    if (!ok) return;
    const summary = `Returned ${count} called number${count === 1 ? "" : "s"} to the pool`;
    setMessage(summary);
    showToast(summary);
  };

  const handleClearCalled = async () => {
    const count = calledTokens.length;
    const ok = await runAction({ action: "clearCalled" });
    if (!ok) return;
    const summary = `Cleared ${count} called number${count === 1 ? "" : "s"}`;
    setMessage(summary);
    showToast(summary);
  };

  const handleRemove = async (token: {
    id: string;
    number: string;
    colorId: string;
  }) => {
    const previous = snapshot;
    if (previous) {
      applyServerSnapshot(snapshotWithoutToken(previous, token.id));
    }
    setSelectedIds((prev) => {
      if (!prev.has(token.id)) return prev;
      const next = new Set(prev);
      next.delete(token.id);
      return next;
    });
    try {
      const params = new URLSearchParams({
        number: token.number,
        colorId: token.colorId,
      });
      const res = await fetch(
        `/api/tokens/${encodeURIComponent(token.id)}?${params}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as {
        error?: string;
        snapshot?: EventSnapshot;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.snapshot) applyServerSnapshot(data.snapshot);
      else await refreshSnapshot();
    } catch (e) {
      if (previous) applyServerSnapshot(previous);
      const text = e instanceof Error ? e.message : "Failed";
      setMessage(text);
      showToast(text);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const drawTotal = LIVE_DRAWER_COLORS.reduce(
    (sum, c) => sum + (colorCounts[c.id] ?? 0),
    0,
  );

  return (
    <>
      <Toast message={toastMessage} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6 xl:overflow-hidden">
            <div className="flex shrink-0 flex-col gap-6 xl:flex-row xl:items-stretch">
            <div className="flex w-full shrink-0 flex-col xl:w-80">
              <div className="flex flex-1 flex-col rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white">Add token</h2>
                <input
                  value={addNumber}
                  onChange={(e) => setAddNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddToken();
                    }
                  }}
                  placeholder="1-10"
                  className="mt-2 h-20 w-full rounded-lg border border-neutral-600 bg-neutral-700 px-4 text-4xl font-bold tabular-nums text-white placeholder:text-2xl placeholder:font-normal placeholder:text-neutral-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-neutral-400">
                  One number, a comma list, or a range like 1-10. All use the
                  selected color.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LIVE_DRAWER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAddColorId(c.id)}
                      className={`min-w-26 flex-1 rounded-md px-3 py-3 text-center text-sm font-semibold ${
                        addColorId === c.id
                          ? "ring-2 ring-sky-400 ring-offset-1 ring-offset-neutral-800"
                          : liveDrawerOutlineClass(c)
                      }`}
                      style={{ backgroundColor: c.hex, color: c.ink }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="min-h-4 flex-1" />
                <button
                  type="button"
                  onClick={handleAddToken}
                  disabled={loading || !addNumber.trim()}
                  className="mt-3 w-full rounded-md bg-teal-600 py-3 text-base font-semibold text-white"
                >
                  Add to pool
                </button>
              </div>
            </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
                <div className="shrink-0 border-b border-neutral-700 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold text-white">On Display</h2>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => runAction({ action: "clear" })}
                      className="inline-flex h-10 shrink-0 items-center rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                    >
                      Clear display
                    </button>
                  </div>
                  {revealed.length === 0 ? (
                    <p className="mt-2 text-neutral-400">Nothing revealed</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap items-center gap-2">
                      {revealed.map((t) => {
                        const color = getLiveDrawerColor(t.colorId);
                        return (
                          <li
                            key={t.id}
                            className={`flex items-center justify-center rounded-full font-bold tabular-nums ${revealedChipClass(t.number)} ${liveDrawerOutlineClass(color)}`}
                            style={{
                              ...liveDrawerFillStyle(color),
                              fontFamily:
                                "var(--font-oswald), Impact, sans-serif",
                              textShadow:
                                color?.ink === "#171717"
                                  ? "none"
                                  : "0 1px 2px rgba(0,0,0,0.45)",
                            }}
                          >
                            {t.number}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="@container flex flex-1 flex-col p-6">
                  <h2 className="text-xl font-bold text-white">Draw controls</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Random draw by color count or select specific tokens below.
                  </p>
                  <div className="mt-4 grid grid-cols-4 gap-2 @min-[70rem]:grid-cols-8">
                    {LIVE_DRAWER_COLORS.map((c) => {
                      const available = poolSummary[c.id] ?? 0;
                      const count = colorCounts[c.id] ?? 0;
                      const empty = available === 0;
                      return (
                        <div
                          key={c.id}
                          className={`min-w-0 text-sm font-semibold ${empty ? "text-neutral-600" : "text-neutral-300"}`}
                        >
                          {c.name}
                          <div
                            className={`mt-1.5 flex h-20 w-full items-stretch overflow-hidden rounded-lg border-2 bg-neutral-700 ${
                              empty ? "opacity-40" : ""
                            }`}
                            style={{ borderColor: c.hex }}
                          >
                            <button
                              type="button"
                              aria-label={`Decrease ${c.name}`}
                              disabled={loading || empty || count <= 0}
                              onClick={() =>
                                setColorDrawCount(c.id, c.name, count - 1)
                              }
                              className="inline-flex w-8 shrink-0 items-center justify-center text-white hover:bg-black/25 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus size={18} />
                            </button>
                            {empty ? (
                              <div className="flex min-w-0 flex-1 items-center justify-center text-3xl font-bold leading-none tabular-nums text-neutral-400">
                                0
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={available}
                                value={count}
                                aria-label={`${c.name} draw count`}
                                onChange={(e) =>
                                  setColorDrawCount(
                                    c.id,
                                    c.name,
                                    Number(e.target.value) || 0,
                                  )
                                }
                                className="h-full min-w-0 flex-1 bg-transparent px-0.5 text-center text-3xl font-bold leading-none tabular-nums text-white [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            )}
                            <button
                              type="button"
                              aria-label={`Increase ${c.name}`}
                              disabled={loading || empty || count >= available}
                              onClick={() =>
                                setColorDrawCount(c.id, c.name, count + 1)
                              }
                              className="inline-flex w-8 shrink-0 items-center justify-center text-white hover:bg-black/25 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading || drawTotal === 0}
                      onClick={handleRandomDraw}
                      className="rounded-md bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
                    >
                      Draw random
                    </button>
                    <button
                      type="button"
                      disabled={loading || selectedIds.size === 0}
                      onClick={handleSelectedDraw}
                      className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Draw selected ({selectedIds.size})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <h2 className="mb-3 text-xl font-bold text-white">
                Token Summary
              </h2>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-neutral-700 bg-neutral-800 shadow-lg">
                <div className="flex flex-wrap items-center gap-3 border-b border-neutral-700 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-neutral-600 p-0.5">
                      <button
                        type="button"
                        onClick={() => setListTab("pool")}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                          listTab === "pool"
                            ? "bg-teal-600 text-white"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        In pool ({poolTokens.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setListTab("called")}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                          listTab === "called"
                            ? "bg-teal-600 text-white"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Called ({calledTokens.length})
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={selectedIds.size === 0}
                      onClick={() => setSelectedIds(new Set())}
                      className="inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm font-semibold text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear selected
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2 overflow-x-auto py-0.5">
                    <span className="shrink-0 text-sm font-semibold tracking-wide text-neutral-300 uppercase">
                      Total
                    </span>
                    <ul
                      aria-label="Pool summary"
                      className="flex flex-nowrap items-center gap-2"
                    >
                    {LIVE_DRAWER_COLORS.map((c) => {
                      const count = poolSummary[c.id] ?? 0;
                      return (
                        <li key={c.id} className="shrink-0">
                          <span
                            title={`${c.name}: ${count}`}
                            className={`box-border flex h-11 w-11 items-center justify-center rounded-full font-bold tabular-nums ${
                              String(count).length >= 2 ? "text-base" : "text-lg"
                            } ${c.id === "black" || c.id === "white" ? "" : "shadow-inner"} ${liveDrawerOutlineClass(c)}`}
                            style={{
                              ...liveDrawerFillStyle(c),
                              textShadow:
                                c.ink === "#171717"
                                  ? "none"
                                  : "0 1px 2px rgba(0,0,0,0.45)",
                            }}
                          >
                            {count}
                          </span>
                        </li>
                      );
                    })}
                    </ul>
                  </div>
                  {listTab === "pool" && (
                    <button
                      type="button"
                      disabled={loading || poolTokens.length === 0}
                      onClick={() => setClearPoolOpen(true)}
                      className="inline-flex h-8 shrink-0 items-center rounded-md border border-red-500/40 px-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear pool
                    </button>
                  )}
                  {listTab === "called" && (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={loading || calledTokens.length === 0}
                        onClick={() => setReturnCalledOpen(true)}
                        className="inline-flex h-8 items-center rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Return to pool
                      </button>
                      <button
                        type="button"
                        disabled={loading || calledTokens.length === 0}
                        onClick={() => setClearCalledOpen(true)}
                        className="inline-flex h-8 items-center rounded-md border border-red-500/40 px-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear called
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-4 pt-2 pb-3">
                  {listTab === "called" ? (
                    calledRows.length === 0 ? (
                      <p className="text-neutral-400">No called numbers</p>
                    ) : (
                      <div className="space-y-1">
                        {calledRows.map(({ color, tokens }) => (
                          <div key={color.id} aria-label={color.name}>
                            <ul className="flex flex-wrap items-start gap-x-2 gap-y-1">
                              {tokens.map((t) => (
                                <li
                                  key={t.id}
                                  className="inline-flex flex-col items-center"
                                >
                                  <span
                                    className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums leading-none ${summaryTokenClass(t.number)} ${liveDrawerOutlineClass(color)}`}
                                    style={summaryTokenStyle(color)}
                                  >
                                    {t.number}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(t)}
                                    title={`Remove ${t.number}`}
                                    className="text-lg leading-none text-neutral-400 hover:text-sky-400"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )
                  ) : poolRows.length === 0 ? (
                    <p className="text-neutral-400">No tokens in pool</p>
                  ) : (
                    <div className="space-y-1">
                      {poolRows.map(({ color, tokens }) => (
                        <div key={color.id} aria-label={color.name}>
                          <ul className="flex flex-wrap items-start gap-x-2 gap-y-1">
                            {tokens.map((t) => {
                              const selected = selectedIds.has(t.id);
                              const arriving = arrivingIds.has(t.id);
                              return (
                                <li
                                  key={t.id}
                                  className="inline-flex flex-col items-center"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleSelect(t.id)}
                                    title={`Select ${t.number}`}
                                    aria-pressed={selected}
                                    className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums leading-none outline-none ${
                                      arriving
                                        ? "live-drawer-token-arrive"
                                        : "transition"
                                    } ${summaryTokenClass(t.number)} ${
                                      selected
                                        ? "ring-4 ring-sky-400 ring-offset-2 ring-offset-neutral-800"
                                        : `${liveDrawerOutlineClass(color)} hover:opacity-90`
                                    }`}
                                    style={summaryTokenStyle(color)}
                                  >
                                    {t.number}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(t)}
                                    title={`Remove ${t.number}`}
                                    className="text-lg leading-none text-neutral-400 hover:text-red-400"
                                  >
                                    ×
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message && (
                  <p className="border-t border-neutral-700 px-5 py-3 text-sm text-amber-300">
                    {message}
                  </p>
                )}
              </div>
            </div>
        </div>
      </div>
      <ConfirmDialog
        open={clearPoolOpen}
        onOpenChange={setClearPoolOpen}
        title="Clear entire pool?"
        message={`This permanently removes all ${poolTokens.length} token${poolTokens.length === 1 ? "" : "s"} from the pool. Called numbers and the spectator display are not affected.\n\nThis cannot be undone.`}
        confirmLabel="Clear pool"
        variant="danger"
        onConfirm={() => {
          void handleClearPool();
        }}
      />
      <ConfirmDialog
        open={returnCalledOpen}
        onOpenChange={setReturnCalledOpen}
        title="Return called numbers to the pool?"
        message={`This puts all ${calledTokens.length} called number${calledTokens.length === 1 ? "" : "s"} back in the pool so they can be drawn again. The spectator display will clear if it is showing a called number.`}
        confirmLabel="Return to pool"
        onConfirm={() => {
          void handleReturnCalled();
        }}
      />
      <ConfirmDialog
        open={clearCalledOpen}
        onOpenChange={setClearCalledOpen}
        title="Clear all called numbers?"
        message={`This permanently deletes all ${calledTokens.length} called number${calledTokens.length === 1 ? "" : "s"}. They will not return to the pool.\n\nThis cannot be undone.`}
        confirmLabel="Clear called"
        variant="danger"
        onConfirm={() => {
          void handleClearCalled();
        }}
      />
    </>
  );
}
