export type MessageBoardGroup = {
  id: string;
  name: string;
};

export type MessageBoardPreset = {
  id: string;
  text: string;
  /** Null means the message is ungrouped. */
  groupId: string | null;
  /** Text size saved with this message. */
  scale: number;
};

export type MessageBoardState = {
  text: string;
  scale: number;
  groups: MessageBoardGroup[];
  presets: MessageBoardPreset[];
  /** Preset currently copied onto the screen, if any. */
  activePresetId: string | null;
};

export const MAX_MESSAGE_BOARD_PRESETS = 40;
export const MAX_MESSAGE_BOARD_GROUPS = 20;
export const MAX_MESSAGE_BOARD_GROUP_NAME = 40;
export const MAX_MESSAGE_BOARD_PRESET_LENGTH = 4000;

export const DEFAULT_MESSAGE_BOARD_SCALE = 1;
export const MIN_MESSAGE_BOARD_SCALE = 0.5;
export const MAX_MESSAGE_BOARD_SCALE = 2.5;
export const MESSAGE_BOARD_SCALE_STEP = 0.1;

export function clampMessageBoardScale(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_MESSAGE_BOARD_SCALE;
  return Math.min(
    MAX_MESSAGE_BOARD_SCALE,
    Math.max(MIN_MESSAGE_BOARD_SCALE, Math.round(n * 10) / 10),
  );
}

export function createDefaultMessageBoardState(): MessageBoardState {
  return {
    text: "",
    scale: DEFAULT_MESSAGE_BOARD_SCALE,
    groups: [],
    presets: [],
    activePresetId: null,
  };
}

export function normalizeMessageBoardGroups(raw: unknown): MessageBoardGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: MessageBoardGroup[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; name?: unknown };
    const name =
      typeof record.name === "string"
        ? record.name.trim().slice(0, MAX_MESSAGE_BOARD_GROUP_NAME)
        : "";
    if (!name) continue;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    groups.push({ id, name });
    if (groups.length >= MAX_MESSAGE_BOARD_GROUPS) break;
  }
  return groups;
}

export function normalizeMessageBoardPresets(
  raw: unknown,
  groups: MessageBoardGroup[] = [],
): MessageBoardPreset[] {
  if (!Array.isArray(raw)) return [];
  const groupIds = new Set(groups.map((group) => group.id));
  const presets: MessageBoardPreset[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as {
      id?: unknown;
      text?: unknown;
      groupId?: unknown;
      scale?: unknown;
    };
    const text =
      typeof record.text === "string"
        ? record.text.slice(0, MAX_MESSAGE_BOARD_PRESET_LENGTH)
        : "";
    if (!text.trim()) continue;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const groupId =
      typeof record.groupId === "string" && groupIds.has(record.groupId)
        ? record.groupId
        : null;
    presets.push({
      id,
      text,
      groupId,
      scale: clampMessageBoardScale(record.scale),
    });
    if (presets.length >= MAX_MESSAGE_BOARD_PRESETS) break;
  }
  return presets;
}
