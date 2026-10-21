"use client";

import {
  Cake,
  Circle,
  Info,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  StickyNote,
  Star,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSuite } from "@/lib/suite-provider";
import {
  LIVE_DRAWER_COLORS,
  MAX_TOKEN_NOTE_LENGTH,
  getLiveDrawerColor,
  liveDrawerFillStyle,
  liveDrawerOutlineClass,
  pruneQueueGroups,
  removeTokenIdsFromQueueGroups,
  type LiveDrawerColor,
  type LiveDrawerDraw,
  type LiveDrawerQueueGroup,
  type LiveDrawerToken,
  type TokenMark,
} from "@/lib/live-drawer/types";
import {
  clampColorCount,
  parseNumberRange,
  poolTokenCount,
  validateColorDrawRequests,
} from "@/lib/live-drawer/draw";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { Toast, useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LiveDrawerTimerPanel } from "@/components/live-drawer/LiveDrawerTimerPanel";
import type { EventSnapshot } from "@/lib/suite-state";

function historyWithoutTokens(
  history: LiveDrawerDraw[] | undefined,
  tokenIds: Set<string>,
): LiveDrawerDraw[] {
  if (tokenIds.size === 0) return history ?? [];
  return (history ?? [])
    .map((batch) => ({
      ...batch,
      tokens: batch.tokens.filter((token) => !tokenIds.has(token.id)),
    }))
    .filter((batch) => batch.tokens.length > 0);
}

function snapshotWithAddedTokens(
  snapshot: EventSnapshot,
  entries: {
    id: string;
    number: string;
    colorId: string;
    mark?: TokenMark | null;
    note?: string | null;
  }[],
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
  const returnedIds = new Set<string>();
  let calledTokens = snapshot.calledTokens;
  const markByKey = new Map<string, TokenMark>(
    entries.flatMap((entry) =>
      entry.mark ? [[`${entry.colorId}:${entry.number}`, entry.mark] as const] : [],
    ),
  );
  const noteByKey = new Map<string, string>(
    entries.flatMap((entry) =>
      entry.note
        ? [[`${entry.colorId}:${entry.number}`, entry.note] as const]
        : [],
    ),
  );

  for (const entry of entries) {
    const key = `${entry.colorId}:${entry.number}`;
    if (poolKeys.has(key)) continue;
    poolKeys.add(key);

    const called = calledByKey.get(key);
    if (called) {
      calledTokens = calledTokens.filter((token) => token.id !== called.id);
      returnedIds.add(called.id);
      toPool.push({
        ...called,
        ...(entry.mark ? { mark: entry.mark } : {}),
        ...(entry.note ? { note: entry.note } : {}),
      });
    } else {
      toPool.push({
        id: entry.id,
        number: entry.number,
        colorId: entry.colorId,
        mark: entry.mark ?? null,
        note: entry.note ?? null,
      });
    }
    poolSummary[entry.colorId] = (poolSummary[entry.colorId] ?? 0) + 1;
  }

  let marksChanged = false;
  const poolTokens = snapshot.poolTokens.map((token) => {
    const key = `${token.colorId}:${token.number}`;
    const mark = markByKey.get(key);
    const note = noteByKey.get(key);
    let next = token;
    if (mark && token.mark !== mark) {
      marksChanged = true;
      next = { ...next, mark };
    }
    if (note && token.note !== note) {
      marksChanged = true;
      next = { ...next, note };
    }
    return next;
  });

  if (toPool.length === 0 && !marksChanged) return snapshot;

  return {
    ...snapshot,
    poolTokens: [...poolTokens, ...toPool],
    calledTokens,
    poolSummary,
    drawHistory: historyWithoutTokens(snapshot.drawHistory, returnedIds),
  };
}

function snapshotWithoutTokens(
  snapshot: EventSnapshot,
  tokenIds: Iterable<string>,
): EventSnapshot {
  const removeIds = tokenIds instanceof Set ? tokenIds : new Set(tokenIds);
  if (removeIds.size === 0) return snapshot;
  const poolSummary = { ...snapshot.poolSummary };
  for (const token of snapshot.poolTokens) {
    if (!removeIds.has(token.id)) continue;
    poolSummary[token.colorId] = Math.max(
      0,
      (poolSummary[token.colorId] ?? 1) - 1,
    );
  }
  return {
    ...snapshot,
    poolTokens: snapshot.poolTokens.filter((token) => !removeIds.has(token.id)),
    calledTokens: snapshot.calledTokens.filter(
      (token) => !removeIds.has(token.id),
    ),
    poolSummary,
    liveDrawer: {
      ...snapshot.liveDrawer,
      revealedTokens: snapshot.liveDrawer.revealedTokens.filter(
        (token) => !removeIds.has(token.id),
      ),
    },
    drawHistory: historyWithoutTokens(snapshot.drawHistory, removeIds),
  };
}

function addTokensSummary(
  added: number,
  skipped: number,
  restored: number,
  marked: number,
): string {
  const parts = [`Added ${added}`];
  if (restored > 0) {
    parts.push(
      `returned ${restored} called number${restored === 1 ? "" : "s"} to the pool`,
    );
  }
  if (marked > 0) {
    parts.push(`marked ${marked}`);
  }
  if (skipped > 0) {
    parts.push(`skipped ${skipped} already in pool`);
  }
  return parts.join(", ");
}

function formatDrawTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function revealedChipClass(number: string): string {
  const digits = number.trim().length;
  if (digits >= 3) return "size-14 px-1 text-base";
  if (digits === 2) return "size-14 text-xl";
  return "size-14 text-2xl";
}

function summaryTokenClass(number: string): string {
  const digits = number.trim().length;
  if (digits >= 3) return "size-12 text-sm";
  if (digits === 2) return "size-12 text-lg";
  return "size-12 text-xl";
}

function historyTokenClass(number: string): string {
  const digits = number.trim().length;
  if (digits >= 3) return "h-8 min-w-8 px-1.5 text-xs";
  if (digits === 2) return "size-8 text-sm";
  return "size-8 text-base";
}

/** +/- stepper that keeps both buttons visible when the panel is narrow. */
function ColorDrawStepper({
  name,
  count,
  available,
  empty,
  borderColor,
  disabled,
  onDecrease,
  onIncrease,
  onCountChange,
}: Readonly<{
  name: string;
  count: number;
  available: number;
  empty: boolean;
  borderColor: string;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onCountChange: (value: number) => void;
}>) {
  return (
    <div
      className={`mt-1 flex h-14 w-full min-w-0 items-stretch overflow-hidden rounded-md border-2 bg-neutral-700 ${
        empty ? "opacity-40" : ""
      }`}
      style={{ borderColor }}
    >
      <button
        type="button"
        aria-label={`Decrease ${name}`}
        disabled={disabled || empty || count <= 0}
        onClick={onDecrease}
        className="inline-flex w-10 shrink-0 items-center justify-center text-white hover:bg-black/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={24} strokeWidth={2.75} />
      </button>
      {empty ? (
        <div className="flex min-w-0 flex-1 items-center justify-center px-0.5 text-xl font-bold leading-none tabular-nums text-neutral-400">
          0
        </div>
      ) : (
        <input
          type="number"
          min={0}
          max={available}
          value={count}
          aria-label={`${name} draw count`}
          onChange={(e) => onCountChange(Number(e.target.value) || 0)}
          className="h-full min-w-0 flex-1 bg-transparent px-0.5 text-center text-xl font-bold leading-none tabular-nums text-white [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      )}
      <button
        type="button"
        aria-label={`Increase ${name}`}
        disabled={disabled || empty || count >= available}
        onClick={onIncrease}
        className="inline-flex w-10 shrink-0 items-center justify-center text-white hover:bg-black/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={24} strokeWidth={2.75} />
      </button>
    </div>
  );
}

const SUMMARY_FIRST_COLUMN_COLOR_IDS = new Set(
  LIVE_DRAWER_COLORS.slice(0, 4).map((color) => color.id),
);

function TokenMarkButton({
  mark,
  onClick,
}: {
  mark: TokenMark | null;
  onClick: () => void;
}) {
  const label =
    mark === "birthday" ? "Birthday" : mark === "vip" ? "VIP" : "No special mark";
  return (
    <button
      type="button"
      title={`${label}. Click to change.`}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-5 w-5 items-center justify-center text-amber-300 hover:text-white"
    >
      {mark === "birthday" ? (
        <Cake size={12} aria-hidden />
      ) : mark === "vip" ? (
        <Star size={12} aria-hidden />
      ) : (
        <Circle size={12} className="text-neutral-500" aria-hidden />
      )}
    </button>
  );
}

function TokenNoteButton({
  note,
  onClick,
}: {
  note: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={note ? `${note} — click to edit` : "Add note"}
      aria-label={note ? `Note: ${note}` : "Add note"}
      onClick={onClick}
      className={`inline-flex h-5 w-5 items-center justify-center hover:text-white ${
        note ? "text-sky-300" : "text-neutral-500"
      }`}
    >
      <StickyNote size={12} aria-hidden />
    </button>
  );
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
    drawHistory,
    refreshSnapshot,
    applyServerSnapshot,
    updateLiveDrawer,
  } = useSuite();
  const { toastMessage, showToast } = useToast();
  const [colorCounts, setColorCounts] = useState<Record<string, number>>({});
  const [anyCount, setAnyCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [addNumber, setAddNumber] = useState("");
  const [addColorId, setAddColorId] = useState<string | null>("blue");
  const [addMark, setAddMark] = useState<TokenMark | null>(null);
  const [addNote, setAddNote] = useState("");
  const [listTab, setListTab] = useState<"pool" | "called">("pool");
  const [markFilter, setMarkFilter] = useState<"all" | TokenMark | "none">(
    "all",
  );
  const [clearPoolOpen, setClearPoolOpen] = useState(false);
  const [clearCalledOpen, setClearCalledOpen] = useState(false);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const [addTokensOpen, setAddTokensOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [noteEditToken, setNoteEditToken] = useState<LiveDrawerToken | null>(
    null,
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [armedQueueTokenKey, setArmedQueueTokenKey] = useState<string | null>(
    null,
  );
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(() => new Set());
  const addInFlightRef = useRef(false);
  const seenPoolKeysRef = useRef<Set<string> | null>(null);
  const queueGroups = state.liveDrawer.queueGroups ?? [];

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

  const colorDrawTotal = LIVE_DRAWER_COLORS.reduce(
    (sum, c) => sum + (colorCounts[c.id] ?? 0),
    0,
  );
  const anyAvailable = Math.max(0, poolTokenCount(poolSummary) - colorDrawTotal);

  useEffect(() => {
    setAnyCount((prev) => (prev > anyAvailable ? anyAvailable : prev));
  }, [anyAvailable]);

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

  const matchesMarkFilter = (token: LiveDrawerToken) => {
    if (markFilter === "all") return true;
    if (markFilter === "none") return token.mark == null;
    return token.mark === markFilter;
  };

  const poolRows = useMemo(() => {
    const byColor = new Map<string, typeof poolTokens>();
    for (const token of poolTokens) {
      if (!matchesMarkFilter(token)) continue;
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
  }, [poolTokens, markFilter]);

  const calledRows = useMemo(() => {
    const byColor = new Map<string, typeof calledTokens>();
    for (const token of calledTokens) {
      if (!matchesMarkFilter(token)) continue;
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
  }, [calledTokens, markFilter]);

  useEffect(() => {
    const poolIds = new Set(poolTokens.map((token) => token.id));
    const pruned = pruneQueueGroups(queueGroups, poolIds);
    const changed =
      pruned.length !== queueGroups.length ||
      pruned.some(
        (group, index) =>
          group.tokenIds.length !== queueGroups[index]?.tokenIds.length ||
          group.tokenIds.some((id, i) => id !== queueGroups[index]?.tokenIds[i]),
      );
    if (!changed) return;
    updateLiveDrawer((prev) => ({
      ...prev,
      queueGroups: pruneQueueGroups(prev.queueGroups, poolIds),
    }));
  }, [poolTokens, queueGroups, updateLiveDrawer]);

  const resolvedQueueGroups = useMemo(() => {
    const byId = new Map(poolTokens.map((token) => [token.id, token]));
    return queueGroups
      .map((group) => ({
        ...group,
        tokens: group.tokenIds
          .map((id) => byId.get(id))
          .filter((token): token is LiveDrawerToken => token != null),
      }))
      .filter((group) => group.tokens.length > 0);
  }, [poolTokens, queueGroups]);

  const notedTokens = useMemo(() => {
    const sortNoted = (a: LiveDrawerToken, b: LiveDrawerToken) => {
      const colorOrder = LIVE_DRAWER_COLORS.findIndex((c) => c.id === a.colorId)
        - LIVE_DRAWER_COLORS.findIndex((c) => c.id === b.colorId);
      if (colorOrder !== 0) return colorOrder;
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    };
    const pool = poolTokens
      .filter((token) => Boolean(token.note))
      .sort(sortNoted)
      .map((token) => ({ token, status: "pool" as const }));
    const called = calledTokens
      .filter((token) => Boolean(token.note))
      .sort(sortNoted)
      .map((token) => ({ token, status: "called" as const }));
    return [...pool, ...called];
  }, [poolTokens, calledTokens]);

  const revealed = state.liveDrawer.revealedTokens;

  const runAction = async (body: Record<string, unknown>) => {
    setLoading(true);
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

  const setAnyDrawCount = (raw: number) => {
    if (anyAvailable === 0 && raw > 0) {
      showToast("No tokens left in the pool");
      setAnyCount(0);
      return;
    }
    if (raw > anyAvailable) {
      showToast(
        `Only ${anyAvailable} token${anyAvailable === 1 ? "" : "s"} left in the pool`,
      );
    }
    setAnyCount(Math.min(Math.max(0, raw), anyAvailable));
  };

  const handleRandomDraw = () => {
    const requests = LIVE_DRAWER_COLORS.map((c) => ({
      colorId: c.id,
      count: colorCounts[c.id] ?? 0,
    })).filter((r) => r.count > 0);

    const error = validateColorDrawRequests(requests, poolSummary, anyCount);
    if (error) {
      showToast(error);
      return;
    }
    void runAction({ action: "draw", colorCounts: requests, anyCount });
  };

  const handleSelectedDraw = () => {
    if (selectedIds.size === 0) {
      showToast("Select tokens to draw");
      return;
    }
    const ids = [...selectedIds];
    void (async () => {
      const ok = await runAction({ action: "draw", tokenIds: ids });
      if (!ok) return;
      updateLiveDrawer((prev) => ({
        ...prev,
        queueGroups: removeTokenIdsFromQueueGroups(prev.queueGroups, ids),
      }));
    })();
  };

  const handleClearHistory = async () => {
    const count = drawHistory.length;
    const ok = await runAction({ action: "clearHistory" });
    if (!ok) return;
    const summary = `Cleared ${count} draw${count === 1 ? "" : "s"} from history`;
    showToast(summary);
  };

  const newQueueGroupId = () => `group-${crypto.randomUUID()}`;

  const addSelectedToQueue = () => {
    if (selectedIds.size === 0) {
      showToast("Select tokens to queue");
      return;
    }
    const poolIds = new Set(poolTokens.map((token) => token.id));
    updateLiveDrawer((prev) => {
      const alreadyQueued = new Set(
        prev.queueGroups.flatMap((group) => group.tokenIds),
      );
      const added = [...selectedIds].filter(
        (id) => poolIds.has(id) && !alreadyQueued.has(id),
      );
      if (added.length === 0) return prev;
      const group: LiveDrawerQueueGroup = {
        id: newQueueGroupId(),
        tokenIds: added,
      };
      return { ...prev, queueGroups: [...prev.queueGroups, group] };
    });
    setSelectedIds(new Set());
  };

  const addSelectedToGroup = (groupId: string) => {
    if (selectedIds.size === 0) {
      showToast("Select tokens to add");
      return;
    }
    const poolIds = new Set(poolTokens.map((token) => token.id));
    updateLiveDrawer((prev) => {
      const alreadyQueued = new Set(
        prev.queueGroups.flatMap((group) => group.tokenIds),
      );
      const added = [...selectedIds].filter(
        (id) => poolIds.has(id) && !alreadyQueued.has(id),
      );
      if (added.length === 0) return prev;
      return {
        ...prev,
        queueGroups: prev.queueGroups.map((group) =>
          group.id === groupId
            ? { ...group, tokenIds: [...group.tokenIds, ...added] }
            : group,
        ),
      };
    });
    setSelectedIds(new Set());
  };

  const removeGroupFromQueue = (groupId: string) => {
    updateLiveDrawer((prev) => ({
      ...prev,
      queueGroups: prev.queueGroups.filter((group) => group.id !== groupId),
    }));
  };

  const removeTokenFromGroup = (groupId: string, tokenId: string) => {
    setArmedQueueTokenKey(null);
    updateLiveDrawer((prev) => ({
      ...prev,
      queueGroups: prev.queueGroups
        .map((group) =>
          group.id === groupId
            ? {
                ...group,
                tokenIds: group.tokenIds.filter((id) => id !== tokenId),
              }
            : group,
        )
        .filter((group) => group.tokenIds.length > 0),
    }));
  };

  const handleQueuedTokenTap = (groupId: string, tokenId: string) => {
    const key = `${groupId}:${tokenId}`;
    if (armedQueueTokenKey === key) {
      removeTokenFromGroup(groupId, tokenId);
      return;
    }
    setArmedQueueTokenKey(key);
  };

  const handleDrawGroup = (groupId: string) => {
    const group = resolvedQueueGroups.find((entry) => entry.id === groupId);
    if (!group || group.tokens.length === 0) {
      showToast("That group is empty");
      return;
    }
    const ids = group.tokens.map((token) => token.id);
    void (async () => {
      const ok = await runAction({ action: "draw", tokenIds: ids });
      if (!ok) return;
      updateLiveDrawer((prev) => ({
        ...prev,
        queueGroups: prev.queueGroups.filter((entry) => entry.id !== groupId),
      }));
    })();
  };

  const postTokens = async (
    tokens: {
      number: string;
      colorId: string;
      mark: TokenMark | null;
      note: string | null;
    }[],
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
      marked?: number;
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
        showToast(text);
      }
      return;
    }
    const note =
      addNote.trim().slice(0, MAX_TOKEN_NOTE_LENGTH) || null;
    const entries = numbers.map((number) => ({
      id: `opt-${crypto.randomUUID()}`,
      number,
      colorId: addColorId,
      mark: addMark,
      note,
    }));
    const previous = snapshot;
    if (previous) {
      applyServerSnapshot(snapshotWithAddedTokens(previous, entries));
    }
    setAddNumber("");
    setAddNote("");
    setListTab("pool");
    addInFlightRef.current = true;
    try {
      const data = await postTokens(
        numbers.map((number) => ({
          number,
          colorId: addColorId,
          mark: addMark,
          note,
        })),
      );
      const added = data.added ?? 0;
      const skipped = data.skipped ?? 0;
      const restored = data.restored ?? 0;
      const marked = data.marked ?? 0;
      if (numbers.length > 1 || skipped > 0 || restored > 0 || marked > 0) {
        const summary = addTokensSummary(added, skipped, restored, marked);
        showToast(summary);
      }
    } catch (e) {
      if (previous) applyServerSnapshot(previous);
      const text = e instanceof Error ? e.message : "Failed";
      showToast(text);
    } finally {
      addInFlightRef.current = false;
    }
  };

  const handleClearPool = async () => {
    const count = poolTokens.length;
    setLoading(true);
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
      showToast(summary);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Failed";
      showToast(text);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSelected = async () => {
    const calledIds = new Set(calledTokens.map((token) => token.id));
    const ids = [...selectedIds].filter((id) => calledIds.has(id));
    if (ids.length === 0) {
      showToast("Select called numbers to return");
      return;
    }
    const ok = await runAction({ action: "return", tokenIds: ids });
    if (!ok) return;
    setSelectedIds(new Set());
    const summary = `Returned ${ids.length} called number${ids.length === 1 ? "" : "s"} to the pool`;
    showToast(summary);
  };

  const handleClearCalled = async () => {
    const count = calledTokens.length;
    const ok = await runAction({ action: "clearCalled" });
    if (!ok) return;
    const summary = `Cleared ${count} called number${count === 1 ? "" : "s"}`;
    showToast(summary);
  };

  const handleReturnOne = async (token: {
    id: string;
    number: string;
    colorId: string;
  }) => {
    const ok = await runAction({ action: "return", tokenIds: [token.id] });
    if (!ok) return;
    const colorName = getLiveDrawerColor(token.colorId)?.name ?? "Number";
    const summary = `Returned ${colorName} ${token.number} to the pool`;
    showToast(summary);
  };

  const handleRemoveSelected = async () => {
    if (selectedIds.size === 0) {
      showToast("Select tokens to delete");
      return;
    }
    const byId = new Map(
      [...poolTokens, ...calledTokens].map((token) => [token.id, token]),
    );
    const tokens = [...selectedIds]
      .map((id) => byId.get(id))
      .filter((token): token is LiveDrawerToken => token != null);
    if (tokens.length === 0) {
      showToast("Select tokens to delete");
      return;
    }
    const ids = tokens.map((token) => token.id);
    const previous = snapshot;
    if (previous) {
      applyServerSnapshot(snapshotWithoutTokens(previous, ids));
    }
    setSelectedIds(new Set());
    setLoading(true);
    try {
      let latest: EventSnapshot | undefined;
      for (const token of tokens) {
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
        if (data.snapshot) latest = data.snapshot;
      }
      if (latest) applyServerSnapshot(latest);
      else await refreshSnapshot();
      showToast(
        `Deleted ${tokens.length} token${tokens.length === 1 ? "" : "s"}`,
      );
    } catch (e) {
      if (previous) applyServerSnapshot(previous);
      showToast(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
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

  const cycleMark = async (token: LiveDrawerToken) => {
    const next: TokenMark | null =
      token.mark === "birthday" ? "vip" : token.mark === "vip" ? null : "birthday";
    setLoading(true);
    try {
      const res = await fetch(`/api/tokens/${token.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark: next }),
      });
      if (!res.ok) throw new Error("Could not update mark");
      await refreshSnapshot();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not update mark");
    } finally {
      setLoading(false);
    }
  };

  const openNoteEditor = (token: LiveDrawerToken) => {
    setNoteEditToken(token);
    setNoteDraft(token.note ?? "");
  };

  const closeNoteEditor = () => {
    setNoteEditToken(null);
    setNoteDraft("");
  };

  const saveNote = async (note: string | null) => {
    const token = noteEditToken;
    if (!token) return;
    const nextNote =
      note == null ? null : note.trim().slice(0, MAX_TOKEN_NOTE_LENGTH) || null;
    if (nextNote === (token.note ?? null)) {
      closeNoteEditor();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tokens/${token.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: nextNote }),
      });
      if (!res.ok) throw new Error("Could not update note");
      await refreshSnapshot();
      closeNoteEditor();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not update note");
    } finally {
      setLoading(false);
    }
  };

  const drawTotal = colorDrawTotal + anyCount;
  const spectatorLive = state.spectatorGame === "liveDrawer";

  return (
    <>
      <Toast message={toastMessage} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Live Drawer. Use the Spectator screen list so the
          projector shows the draw.
        </SpectatorScreenNotice>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex min-h-full min-w-0 flex-col divide-y divide-neutral-700 xl:flex-row xl:divide-y-0 xl:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-neutral-700 xl:border-r xl:border-neutral-700">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-3 py-4">
                <div className="shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-bold text-white">On Display</h2>
                    <button
                      type="button"
                      disabled={loading || revealed.length === 0}
                      onClick={() => runAction({ action: "clear" })}
                      className="shrink-0 text-sm font-semibold text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] grid-rows-2 items-end gap-x-4 gap-y-2">
                  <div className="grid grid-cols-5 gap-2">
                    {LIVE_DRAWER_COLORS.slice(0, 5).map((c) => {
                      const available = poolSummary[c.id] ?? 0;
                      const count = colorCounts[c.id] ?? 0;
                      const empty = available === 0;
                      return (
                        <div
                          key={c.id}
                          className={`min-w-0 text-xs font-semibold ${empty ? "text-neutral-600" : "text-neutral-300"}`}
                        >
                          {c.name}
                          <ColorDrawStepper
                            name={c.name}
                            count={count}
                            available={available}
                            empty={empty}
                            borderColor={c.hex}
                            disabled={loading}
                            onDecrease={() =>
                              setColorDrawCount(c.id, c.name, count - 1)
                            }
                            onIncrease={() =>
                              setColorDrawCount(c.id, c.name, count + 1)
                            }
                            onCountChange={(value) =>
                              setColorDrawCount(c.id, c.name, value)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={loading || drawTotal === 0}
                    onClick={handleRandomDraw}
                    className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Draw random
                  </button>
                  <div className="grid grid-cols-5 gap-2">
                    {LIVE_DRAWER_COLORS.slice(5).map((c) => {
                      const available = poolSummary[c.id] ?? 0;
                      const count = colorCounts[c.id] ?? 0;
                      const empty = available === 0;
                      return (
                        <div
                          key={c.id}
                          className={`min-w-0 text-xs font-semibold ${empty ? "text-neutral-600" : "text-neutral-300"}`}
                        >
                          {c.name}
                          <ColorDrawStepper
                            name={c.name}
                            count={count}
                            available={available}
                            empty={empty}
                            borderColor={c.hex}
                            disabled={loading}
                            onDecrease={() =>
                              setColorDrawCount(c.id, c.name, count - 1)
                            }
                            onIncrease={() =>
                              setColorDrawCount(c.id, c.name, count + 1)
                            }
                            onCountChange={(value) =>
                              setColorDrawCount(c.id, c.name, value)
                            }
                          />
                        </div>
                      );
                    })}
                    <div
                      className={`min-w-0 text-xs font-semibold ${
                        anyAvailable === 0 && anyCount === 0
                          ? "text-neutral-600"
                          : "text-neutral-300"
                      }`}
                    >
                      Any
                      <ColorDrawStepper
                        name="Any"
                        count={anyCount}
                        available={anyAvailable}
                        empty={anyAvailable === 0 && anyCount === 0}
                        borderColor="#a3a3a3"
                        disabled={loading}
                        onDecrease={() => setAnyDrawCount(anyCount - 1)}
                        onIncrease={() => setAnyDrawCount(anyCount + 1)}
                        onCountChange={setAnyDrawCount}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading || selectedIds.size === 0}
                    onClick={handleSelectedDraw}
                    className={`inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                      selectedIds.size === 0
                        ? "border border-neutral-500 bg-transparent text-neutral-400 disabled:opacity-100"
                        : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
                    }`}
                  >
                    Draw selected ({selectedIds.size})
                  </button>
                </div>
              </div>
              <div className="px-3 py-4">
                <h3 className="text-base font-bold text-white">Queued Tokens</h3>
                {resolvedQueueGroups.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-400">
                    Select pool tokens, then Queue tokens in Token Summary.
                  </p>
                ) : (
                  <ol className="mt-2 grid max-h-[13.5rem] grid-cols-1 gap-1.5 overflow-y-auto p-0.5 min-[72rem]:grid-cols-2">
                    {resolvedQueueGroups.map((group) => (
                      <li
                        key={group.id}
                        className="flex min-w-0 items-center gap-2 rounded-md border border-neutral-600 bg-neutral-900/60 px-2 py-1"
                      >
                        <ul className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto p-1.5">
                          {group.tokens.map((token) => {
                            const color = getLiveDrawerColor(token.colorId);
                            const armed =
                              armedQueueTokenKey ===
                              `${group.id}:${token.id}`;
                            return (
                              <li key={token.id} className="shrink-0">
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() =>
                                    handleQueuedTokenTap(group.id, token.id)
                                  }
                                  aria-label={
                                    armed
                                      ? `Confirm remove ${token.number} from group`
                                      : `Mark ${token.number} to remove from group`
                                  }
                                  title={
                                    armed
                                      ? "Tap again to remove"
                                      : token.note
                                        ? `${color?.name ?? token.colorId} · ${token.note}`
                                        : color?.name
                                  }
                                  className={`inline-flex size-11 items-center justify-center rounded-full text-base font-bold tabular-nums outline-none ${
                                    armed
                                      ? "bg-red-600 text-white ring-2 ring-red-300 ring-offset-2 ring-offset-neutral-900"
                                      : liveDrawerOutlineClass(color)
                                  }`}
                                  style={
                                    armed
                                      ? undefined
                                      : color
                                        ? summaryTokenStyle(color)
                                        : undefined
                                  }
                                >
                                  {token.number}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleDrawGroup(group.id)}
                            className="inline-flex h-11 min-w-16 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                          >
                            Draw
                          </button>
                          <button
                            type="button"
                            disabled={loading || selectedIds.size === 0}
                            onClick={() => addSelectedToGroup(group.id)}
                            className="inline-flex h-11 min-w-14 items-center justify-center rounded-lg border border-sky-500/40 px-3 text-sm font-bold text-sky-300 hover:bg-sky-500/10 disabled:opacity-40"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => removeGroupFromQueue(group.id)}
                            className="inline-flex size-11 items-center justify-center rounded-lg border border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-red-300"
                            aria-label="Remove group"
                          >
                            <X size={22} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col px-3 py-4">
              <div className="flex min-w-0 flex-1 flex-col overflow-visible">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <h2 className="text-base font-bold text-white">
                    Token Summary
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="shrink-0 text-sm font-semibold tracking-wide text-neutral-300 uppercase">
                      Total
                    </span>
                    <ul
                      aria-label="Pool summary"
                      className="flex flex-nowrap items-center justify-center gap-2"
                    >
                      {LIVE_DRAWER_COLORS.map((c) => {
                        const count = poolSummary[c.id] ?? 0;
                        return (
                          <li key={c.id} className="shrink-0">
                            <span
                              title={`${c.name}: ${count}`}
                              className={`box-border flex h-11 w-11 items-center justify-center rounded-full font-bold tabular-nums ${
                                String(count).length >= 2
                                  ? "text-base"
                                  : "text-lg"
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
                  <div className="flex justify-end">
                    <div className="flex rounded-lg border border-neutral-600 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setListTab("pool");
                          setSelectedIds(new Set());
                        }}
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
                        onClick={() => {
                          setListTab("called");
                          setSelectedIds(new Set());
                        }}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                          listTab === "called"
                            ? "bg-teal-600 text-white"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Called ({calledTokens.length})
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-stretch gap-2">
                  {listTab === "pool" && (
                    <>
                      <button
                        type="button"
                        disabled={loading || selectedIds.size === 0}
                        onClick={handleSelectedDraw}
                        className={`inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                          selectedIds.size === 0
                            ? "border border-neutral-500 bg-transparent text-neutral-400 disabled:opacity-100"
                            : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
                        }`}
                      >
                        Draw selected ({selectedIds.size})
                      </button>
                      <button
                        type="button"
                        disabled={loading || selectedIds.size === 0}
                        onClick={addSelectedToQueue}
                        className="inline-flex shrink-0 items-center rounded-md border border-neutral-600 px-3 py-1.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Queue tokens ({selectedIds.size})
                      </button>
                    </>
                  )}
                  {listTab === "called" && (
                    <button
                      type="button"
                      disabled={loading || selectedIds.size === 0}
                      onClick={() => void handleReturnSelected()}
                      className={`inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                        selectedIds.size === 0
                          ? "border border-neutral-500 bg-transparent text-neutral-400 disabled:opacity-100"
                          : "border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
                      }`}
                    >
                      Return selected ({selectedIds.size})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddTokensOpen(true)}
                    className="inline-flex shrink-0 items-center rounded-md border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500"
                  >
                    Add tokens
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleRemoveSelected()}
                      className="inline-flex shrink-0 items-center rounded-md border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete selected ({selectedIds.size})
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={selectedIds.size === 0}
                    onClick={() => setSelectedIds(new Set())}
                    className={`inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                      selectedIds.size === 0
                        ? "border border-neutral-500 bg-transparent text-neutral-400 disabled:opacity-100"
                        : "border border-neutral-500 bg-neutral-700 text-white hover:bg-neutral-600"
                    }`}
                  >
                    Clear selected
                  </button>
                  {listTab === "pool" && (
                    <button
                      type="button"
                      disabled={loading || poolTokens.length === 0}
                      onClick={() => setClearPoolOpen(true)}
                      className="ml-auto shrink-0 text-sm font-semibold text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear pool
                    </button>
                  )}
                  {listTab === "called" && (
                    <button
                      type="button"
                      disabled={loading || calledTokens.length === 0}
                      onClick={() => setClearCalledOpen(true)}
                      className="ml-auto inline-flex shrink-0 items-center rounded-md border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear called
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(
                    [
                      ["all", "All"],
                      ["none", "None"],
                      ["birthday", "Birthday"],
                      ["vip", "VIP"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMarkFilter(id)}
                      className={`h-7 rounded-full px-2.5 text-xs font-semibold ${
                        markFilter === id
                          ? "border border-teal-500 bg-teal-600 text-white"
                          : "border border-neutral-600 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="pt-2 pb-1">
                  {listTab === "called" ? (
                    calledRows.length === 0 ? (
                      <p className="text-neutral-400">No called numbers</p>
                    ) : (
                      <div className="grid grid-cols-2 items-start gap-4">
                        {(
                          [
                            calledRows.filter((row) =>
                              SUMMARY_FIRST_COLUMN_COLOR_IDS.has(row.color.id),
                            ),
                            calledRows.filter(
                              (row) =>
                                !SUMMARY_FIRST_COLUMN_COLOR_IDS.has(
                                  row.color.id,
                                ),
                            ),
                          ] as const
                        ).map((column, columnIndex) => (
                          <div key={columnIndex} className="min-w-0 space-y-1">
                            {column.map(({ color, tokens }) => (
                              <div key={color.id} aria-label={color.name}>
                                <ul className="flex flex-wrap items-start gap-x-2 gap-y-1">
                                  {tokens.map((t) => {
                                    const selected = selectedIds.has(t.id);
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
                                          className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums leading-none outline-none transition ${summaryTokenClass(t.number)} ${
                                            selected
                                              ? "ring-4 ring-sky-400 ring-offset-2 ring-offset-neutral-800"
                                              : `${liveDrawerOutlineClass(color)} hover:opacity-90`
                                          }`}
                                          style={summaryTokenStyle(color)}
                                        >
                                          {t.number}
                                        </button>
                                        <div className="flex items-center gap-0.5">
                                          <TokenMarkButton
                                            mark={t.mark}
                                            onClick={() => void cycleMark(t)}
                                          />
                                          <TokenNoteButton
                                            note={t.note}
                                            onClick={() => openNoteEditor(t)}
                                          />
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )
                  ) : poolRows.length === 0 ? (
                    <p className="text-neutral-400">No tokens in pool</p>
                  ) : (
                    <div className="grid grid-cols-2 items-start gap-4">
                      {(
                        [
                          poolRows.filter((row) =>
                            SUMMARY_FIRST_COLUMN_COLOR_IDS.has(row.color.id),
                          ),
                          poolRows.filter(
                            (row) =>
                              !SUMMARY_FIRST_COLUMN_COLOR_IDS.has(row.color.id),
                          ),
                        ] as const
                      ).map((column, columnIndex) => (
                        <div key={columnIndex} className="min-w-0 space-y-1">
                          {column.map(({ color, tokens }) => (
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
                                      <div className="flex items-center gap-0.5">
                                        <TokenMarkButton
                                          mark={t.mark}
                                          onClick={() => void cycleMark(t)}
                                        />
                                        <TokenNoteButton
                                          note={t.note}
                                          onClick={() => openNoteEditor(t)}
                                        />
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              </div>
              </div>

              <aside
                className={`relative flex w-full shrink-0 flex-col divide-y divide-neutral-700 overflow-visible transition-[width] duration-200 xl:self-stretch ${
                  rightPanelCollapsed ? "xl:w-6" : "xl:w-80"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setRightPanelCollapsed((c) => !c)}
                  className="absolute top-1/2 left-0 z-20 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900 text-neutral-400 shadow-md transition-colors hover:bg-neutral-800 hover:text-white xl:inline-flex"
                  aria-label={
                    rightPanelCollapsed
                      ? "Expand side panel"
                      : "Collapse side panel"
                  }
                  title={
                    rightPanelCollapsed
                      ? "Expand side panel"
                      : "Collapse side panel"
                  }
                >
                  {rightPanelCollapsed ? (
                    <PanelRightOpen size={22} strokeWidth={1.5} aria-hidden />
                  ) : (
                    <PanelRightClose size={22} strokeWidth={1.5} aria-hidden />
                  )}
                </button>
                <div
                  className={
                    rightPanelCollapsed
                      ? "max-xl:contents xl:hidden"
                      : "contents"
                  }
                >
                <LiveDrawerTimerPanel />
                <section className="flex shrink-0 flex-col px-3 py-4">
                  <div className="flex shrink-0 items-baseline justify-between gap-x-3">
                    <h2 className="text-base font-bold text-white">
                      Draw history
                    </h2>
                    <button
                      type="button"
                      disabled={loading || drawHistory.length === 0}
                      onClick={() => setClearHistoryOpen(true)}
                      className="shrink-0 text-sm font-semibold text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear history
                    </button>
                  </div>
                  {drawHistory.length === 0 ? (
                    <p className="mt-2 text-neutral-400">No draws yet</p>
                  ) : (
                    <ol className="mt-2 max-h-52 divide-y divide-neutral-700/80 overflow-y-auto">
                      {drawHistory.map((batch) => (
                        <li
                          key={batch.id}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5"
                        >
                          <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                            {formatDrawTime(batch.drawnAt)}
                          </span>
                          <ul className="flex flex-wrap items-center gap-1">
                            {batch.tokens.map((token) => {
                              const color = getLiveDrawerColor(token.colorId);
                              return (
                                <li key={token.id} className="group relative">
                                  <span
                                    className={`inline-flex items-center justify-center rounded-full font-bold tabular-nums leading-none ${historyTokenClass(token.number)} ${liveDrawerOutlineClass(color)}`}
                                    style={
                                      color
                                        ? summaryTokenStyle(color)
                                        : undefined
                                    }
                                  >
                                    {token.number}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={loading}
                                    aria-label={`Return ${color?.name ?? "token"} ${token.number}`}
                                    onClick={() => handleReturnOne(token)}
                                    className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950 px-2 py-1 text-[10px] leading-none font-semibold whitespace-nowrap text-teal-200 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                                  >
                                    Return
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
                  <h2 className="mb-2 text-base font-bold text-white">
                    Notes ({notedTokens.length})
                  </h2>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {notedTokens.length === 0 ? (
                      <p className="text-sm text-neutral-400">
                        No notes yet. Add a note when creating a token, or tap
                        the note icon under a number.
                      </p>
                    ) : (
                      <ul className="min-h-0 flex-1 divide-y divide-neutral-700/80 overflow-y-auto">
                        {notedTokens.map(({ token, status }) => {
                          const color = getLiveDrawerColor(token.colorId);
                          return (
                            <li key={token.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (status === "pool") {
                                    setListTab("pool");
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      next.add(token.id);
                                      return next;
                                    });
                                  } else {
                                    setListTab("called");
                                  }
                                  openNoteEditor(token);
                                }}
                                className="flex w-full items-center gap-2 py-2 text-left hover:bg-neutral-800/80"
                              >
                                <span
                                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${liveDrawerOutlineClass(color)}`}
                                  style={
                                    color
                                      ? summaryTokenStyle(color)
                                      : undefined
                                  }
                                >
                                  {token.number}
                                </span>
                                <span className="min-w-0 flex-1 text-sm leading-snug text-sky-200/90">
                                  {token.note}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                </div>
              </aside>
            </div>
      </div>
      </div>

      <Dialog.Root
        open={noteEditToken != null}
        onOpenChange={(open) => {
          if (!open) closeNoteEditor();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl focus:outline-none">
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute top-4 right-4 rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
            <Dialog.Title className="pr-8 text-lg font-semibold text-white">
              {noteEditToken?.note ? "Edit note" : "Add note"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-neutral-400">
              {noteEditToken
                ? `${getLiveDrawerColor(noteEditToken.colorId)?.name ?? "Token"} ${noteEditToken.number}`
                : "Token note"}
            </Dialog.Description>
            <textarea
              value={noteDraft}
              onChange={(e) =>
                setNoteDraft(e.target.value.slice(0, MAX_TOKEN_NOTE_LENGTH))
              }
              maxLength={MAX_TOKEN_NOTE_LENGTH}
              rows={4}
              placeholder="Note (optional)"
              className="mt-4 w-full resize-y rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void saveNote(noteDraft)}
                className="inline-flex h-10 items-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                disabled={loading || !(noteEditToken?.note || noteDraft.trim())}
                onClick={() => void saveNote(null)}
                className="inline-flex h-10 items-center rounded-md border border-red-500/40 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear note
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={closeNoteEditor}
                className="ml-auto inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={addTokensOpen} onOpenChange={setAddTokensOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl focus:outline-none">
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute top-4 right-4 rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
            <div className="flex items-center gap-1.5 pr-8">
              <Dialog.Title className="text-lg font-semibold text-white">
                Add tokens
              </Dialog.Title>
              <Tooltip
                side="bottom"
                content="One number, a comma list, or a range like 1-10. All use the selected color."
              >
                <button
                  type="button"
                  aria-label="How to enter numbers"
                  className="inline-flex size-5 items-center justify-center rounded-full text-neutral-400 hover:text-white"
                >
                  <Info size={14} aria-hidden />
                </button>
              </Tooltip>
            </div>
            <Dialog.Description className="mt-1 text-sm text-neutral-400">
              Choose a color, optional mark and note, then add numbers to the
              pool.
            </Dialog.Description>
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
              className="mt-4 h-12 w-full rounded-lg border border-neutral-600 bg-neutral-700 px-3 text-2xl font-bold tabular-nums text-white placeholder:text-lg placeholder:font-normal placeholder:text-neutral-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {LIVE_DRAWER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAddColorId(c.id)}
                  className={`min-w-20 flex-1 rounded-md px-3 py-2.5 text-center text-sm font-semibold ${
                    addColorId === c.id
                      ? "ring-2 ring-sky-400 ring-offset-1 ring-offset-neutral-900"
                      : liveDrawerOutlineClass(c)
                  }`}
                  style={{ backgroundColor: c.hex, color: c.ink }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  ["birthday", "Birthday", Cake],
                  ["vip", "VIP", Star],
                ] as const
              ).map(([id, label, Icon]) => {
                const selected = addMark === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAddMark(selected ? null : id)}
                    className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold ${
                      selected
                        ? "bg-amber-400 text-neutral-950"
                        : "border border-neutral-600 text-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
            <input
              value={addNote}
              onChange={(e) =>
                setAddNote(e.target.value.slice(0, MAX_TOKEN_NOTE_LENGTH))
              }
              placeholder="Note (optional)"
              maxLength={MAX_TOKEN_NOTE_LENGTH}
              className="mt-3 h-10 w-full rounded-lg border border-neutral-600 bg-neutral-700 px-3 text-sm text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleAddToken()}
              disabled={loading || !addNumber.trim()}
              className="mt-4 w-full rounded-md bg-teal-600 py-3 text-base font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              Add to pool
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
      <ConfirmDialog
        open={clearHistoryOpen}
        onOpenChange={setClearHistoryOpen}
        title="Clear draw history?"
        message={`This removes the list of past draws (${drawHistory.length}). Called numbers stay called and can still be returned from the Called tab.\n\nThis cannot be undone.`}
        confirmLabel="Clear history"
        variant="danger"
        onConfirm={() => {
          void handleClearHistory();
        }}
      />
    </>
  );
}
