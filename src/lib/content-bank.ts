import { uid } from "@/lib/utils";

export type ContentGroup = {
  id: string;
  name: string;
};

export const MAX_CONTENT_GROUPS = 20;
export const MAX_CONTENT_GROUP_NAME = 40;

export type BankGroupChange =
  | { type: "add"; name: string }
  | { type: "rename"; id: string; name: string }
  | { type: "delete"; id: string }
  | { type: "move"; itemId: string; groupId: string | null };

export function normalizeContentGroups(raw: unknown): ContentGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: ContentGroup[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; name?: unknown };
    const name =
      typeof record.name === "string"
        ? record.name.trim().slice(0, MAX_CONTENT_GROUP_NAME)
        : "";
    if (!name) continue;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    groups.push({ id, name });
    if (groups.length >= MAX_CONTENT_GROUPS) break;
  }
  return groups;
}

/** Missing or unknown ids stay ungrouped so older saves keep working. */
export function groupIdOf(
  raw: unknown,
  groups: readonly ContentGroup[],
): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as { groupId?: unknown }).groupId;
  if (typeof value !== "string") return null;
  return groups.some((group) => group.id === value) ? value : null;
}

export function applyBankGroupChange<T extends { id: string; groupId: string | null }>(
  groups: readonly ContentGroup[],
  items: readonly T[],
  change: BankGroupChange,
): {
  groups: ContentGroup[];
  items: T[];
  focusGroupId: string | null;
  changed: boolean;
} {
  if (change.type === "add") {
    const name = change.name.trim().slice(0, MAX_CONTENT_GROUP_NAME);
    if (!name || groups.length >= MAX_CONTENT_GROUPS) {
      return { groups: [...groups], items: [...items], focusGroupId: null, changed: false };
    }
    const group = { id: uid(), name };
    return {
      groups: [...groups, group],
      items: [...items],
      focusGroupId: group.id,
      changed: true,
    };
  }
  if (change.type === "rename") {
    const name = change.name.trim().slice(0, MAX_CONTENT_GROUP_NAME);
    if (!name) {
      return { groups: [...groups], items: [...items], focusGroupId: null, changed: false };
    }
    return {
      groups: groups.map((group) =>
        group.id === change.id ? { ...group, name } : group,
      ),
      items: [...items],
      focusGroupId: null,
      changed: true,
    };
  }
  if (change.type === "delete") {
    const exists = groups.some((group) => group.id === change.id);
    if (!exists) {
      return { groups: [...groups], items: [...items], focusGroupId: null, changed: false };
    }
    return {
      groups: groups.filter((group) => group.id !== change.id),
      items: items.map((item) =>
        item.groupId === change.id ? { ...item, groupId: null } : item,
      ),
      focusGroupId: null,
      changed: true,
    };
  }
  const groupId =
    change.groupId && groups.some((group) => group.id === change.groupId)
      ? change.groupId
      : null;
  const current = items.find((item) => item.id === change.itemId);
  if (!current || (current.groupId ?? null) === groupId) {
    return { groups: [...groups], items: [...items], focusGroupId: null, changed: false };
  }
  return {
    groups: [...groups],
    items: items.map((item) =>
      item.id === change.itemId ? { ...item, groupId } : item,
    ),
    focusGroupId: null,
    changed: true,
  };
}

export function claimBankId(
  preferred: string,
  seen: Set<string>,
  fallback: string,
): string {
  const base = preferred.trim() || fallback;
  let id = base;
  let n = 2;
  while (seen.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  seen.add(id);
  return id;
}

/** Older saves were `{ id, name, savedAt, payload }`. New bank rows are the content. */
export function legacyNamedPayload(
  raw: unknown,
): { id: string; name: string; payload: unknown } | null {
  if (!raw || typeof raw !== "object" || !("payload" in raw)) return null;
  const record = raw as {
    id?: unknown;
    name?: unknown;
    savedAt?: unknown;
    payload?: unknown;
  };
  if (!("savedAt" in record) && !("name" in record)) return null;
  return {
    id: typeof record.id === "string" ? record.id.trim() : "",
    name: typeof record.name === "string" ? record.name.trim() : "",
    payload: record.payload,
  };
}

export function appendUnique<T>(
  existing: T[],
  incoming: T[],
  keyOf: (item: T) => string,
): T[] {
  const seen = new Set(existing.map(keyOf));
  const next = [...existing];
  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}
