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
