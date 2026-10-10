"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, FolderPlus, MessageSquarePlus, Minus, Plus, Trash2, X } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { Select } from "@/components/ui/Select";
import { useSuite } from "@/lib/suite-provider";
import { uid } from "@/lib/utils";
import {
  clampMessageBoardScale,
  DEFAULT_MESSAGE_BOARD_SCALE,
  MAX_MESSAGE_BOARD_GROUP_NAME,
  MAX_MESSAGE_BOARD_GROUPS,
  MAX_MESSAGE_BOARD_PRESETS,
  MAX_MESSAGE_BOARD_PRESET_LENGTH,
  MAX_MESSAGE_BOARD_SCALE,
  MESSAGE_BOARD_SCALE_STEP,
  MIN_MESSAGE_BOARD_SCALE,
  type MessageBoardPreset,
} from "@/lib/message-board/types";

function previewText(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat || "Empty message";
}

function resizeTextarea(el: HTMLTextAreaElement, maxPx: number) {
  el.style.height = "0px";
  const next = Math.min(el.scrollHeight, maxPx);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
}

function AutoTextarea({
  value,
  maxPx,
  autoFocus,
  onKeyDown,
  compact = false,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  maxPx: number;
  compact?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (compact && !value.includes("\n")) {
      ref.current.style.height = "";
      ref.current.style.overflowY = "hidden";
      return;
    }
    resizeTextarea(ref.current, maxPx);
  }, [value, maxPx, compact]);

  useLayoutEffect(() => {
    if (!autoFocus || !ref.current) return;
    ref.current.focus();
    const len = ref.current.value.length;
    ref.current.setSelectionRange(len, len);
  }, [autoFocus]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      value={value}
      onKeyDown={onKeyDown}
      className={`block w-full resize-none rounded-md border border-neutral-700 bg-neutral-900 text-sm leading-5 text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none ${compact ? "h-7 px-2.5 py-0" : "px-2.5 py-1.5"} ${props.className ?? ""}`}
    />
  );
}

function ShowButton({
  onScreen,
  disabled,
  onClick,
}: Readonly<{
  onScreen: boolean;
  disabled: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-semibold text-white disabled:opacity-40 ${
        onScreen
          ? "border border-sky-400 bg-sky-700 hover:bg-sky-600"
          : "border border-teal-500 bg-teal-600 hover:bg-teal-500"
      }`}
    >
      {onScreen ? "On screen" : "Show"}
    </button>
  );
}

function PromptDialog({
  open,
  onOpenChange,
  title,
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  placeholder,
  multiline = false,
  disabled = false,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  placeholder: string;
  multiline?: boolean;
  disabled?: boolean;
}>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="m-0 text-lg font-semibold text-neutral-200">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (disabled) return;
              onSubmit();
            }}
          >
            <label className="block">
              <span className="mb-2 block text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                {label}
              </span>
              {multiline ? (
                <textarea
                  autoFocus
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder={placeholder}
                  aria-label={label}
                  rows={4}
                  className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
              ) : (
                <input
                  autoFocus
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder={placeholder}
                  aria-label={label}
                  className="h-10 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sky-500 focus:outline-none"
                />
              )}
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-9 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={disabled}
                className="h-9 rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RemoveButton({
  index,
  onClick,
}: Readonly<{
  index: number;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      aria-label={`Remove saved message ${index + 1}`}
      onClick={onClick}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
    >
      <Trash2 size={14} />
    </button>
  );
}

export function MessageBoardHostPanel() {
  const { state, updateMessageBoard } = useSuite();
  const text = state.messageBoard?.text ?? "";
  const scale = clampMessageBoardScale(state.messageBoard?.scale);
  const groups = state.messageBoard?.groups ?? [];
  const presets = state.messageBoard?.presets ?? [];
  const activePresetId = state.messageBoard?.activePresetId ?? null;
  const trimmed = text.trim();
  const alreadySaved =
    trimmed.length > 0 &&
    presets.some((preset) => preset.text.trim() === trimmed);
  const atLimit = presets.length >= MAX_MESSAGE_BOARD_PRESETS;
  const atGroupLimit = groups.length >= MAX_MESSAGE_BOARD_GROUPS;
  const [draft, setDraft] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<"all" | "ungrouped" | string>(
    "all",
  );
  const [groupDraft, setGroupDraft] = useState("");
  const [addMessageOpen, setAddMessageOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const skipRenameRef = useRef(false);
  const [renameDraft, setRenameDraft] = useState("");
  const selectedGroupId =
    groupFilter !== "all" &&
    groupFilter !== "ungrouped" &&
    groups.some((group) => group.id === groupFilter)
      ? groupFilter
      : null;
  const draftTrimmed = draft.trim();
  const draftDuplicate =
    draftTrimmed.length > 0 &&
    presets.some((preset) => preset.text.trim() === draftTrimmed);

  const savePreset = () => {
    if (!trimmed || alreadySaved || atLimit) return;
    const id = uid();
    updateMessageBoard((prev) => ({
      ...prev,
      presets: [
        {
          id,
          text: text.slice(0, MAX_MESSAGE_BOARD_PRESET_LENGTH),
          groupId: selectedGroupId,
        },
        ...prev.presets,
      ].slice(0, MAX_MESSAGE_BOARD_PRESETS),
      activePresetId: id,
    }));
    setExpandedId(null);
  };

  const addDraft = () => {
    if (!draftTrimmed || draftDuplicate || atLimit) return;
    const id = uid();
    updateMessageBoard((prev) => ({
      ...prev,
      presets: [
        {
          id,
          text: draftTrimmed.slice(0, MAX_MESSAGE_BOARD_PRESET_LENGTH),
          groupId: selectedGroupId,
        },
        ...prev.presets,
      ].slice(0, MAX_MESSAGE_BOARD_PRESETS),
    }));
    setDraft("");
    setExpandedId(null);
    setAddMessageOpen(false);
  };

  const showPreset = (preset: MessageBoardPreset) => {
    if (!preset.text.trim()) return;
    updateMessageBoard((prev) => ({
      ...prev,
      text: preset.text,
      activePresetId: preset.id,
    }));
  };

  const updatePresetText = (id: string, value: string) => {
    const next = value.slice(0, MAX_MESSAGE_BOARD_PRESET_LENGTH);
    updateMessageBoard((prev) => ({
      ...prev,
      presets: prev.presets.map((item) =>
        item.id === id ? { ...item, text: next } : item,
      ),
      text: prev.activePresetId === id ? next : prev.text,
    }));
  };

  const removePreset = (id: string) => {
    setExpandedId((current) => (current === id ? null : current));
    updateMessageBoard((prev) => ({
      ...prev,
      presets: prev.presets.filter((item) => item.id !== id),
      activePresetId: prev.activePresetId === id ? null : prev.activePresetId,
    }));
  };

  const addGroup = () => {
    const name = groupDraft.trim().slice(0, MAX_MESSAGE_BOARD_GROUP_NAME);
    if (!name || atGroupLimit) return;
    const id = uid();
    updateMessageBoard((prev) => ({
      ...prev,
      groups: [...prev.groups, { id, name }].slice(0, MAX_MESSAGE_BOARD_GROUPS),
    }));
    setGroupDraft("");
    setGroupFilter(id);
    setAddGroupOpen(false);
  };

  const renameGroup = (id: string) => {
    const name = renameDraft.trim().slice(0, MAX_MESSAGE_BOARD_GROUP_NAME);
    if (!name) {
      setRenamingGroupId(null);
      return;
    }
    updateMessageBoard((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === id ? { ...group, name } : group,
      ),
    }));
    setRenamingGroupId(null);
  };

  const deleteGroup = (id: string) => {
    updateMessageBoard((prev) => ({
      ...prev,
      groups: prev.groups.filter((group) => group.id !== id),
      presets: prev.presets.map((preset) =>
        preset.groupId === id ? { ...preset, groupId: null } : preset,
      ),
    }));
    setGroupFilter("all");
    setRenamingGroupId(null);
  };

  const movePreset = (id: string, groupId: string) => {
    updateMessageBoard((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === id
          ? { ...preset, groupId: groupId === "ungrouped" ? null : groupId }
          : preset,
      ),
    }));
  };

  const visiblePresets = presets.filter((preset) => {
    if (groupFilter === "all") return true;
    if (groupFilter === "ungrouped") return preset.groupId == null;
    return preset.groupId === groupFilter;
  });
  const groupOptions = [
    { value: "ungrouped", label: "Ungrouped" },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-800 px-8 py-3">
        <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          Message size
        </span>
        <span className="min-w-12 text-right text-sm font-semibold tabular-nums text-neutral-200">
          {Math.round(scale * 100)}%
        </span>
        <input
          type="range"
          min={MIN_MESSAGE_BOARD_SCALE}
          max={MAX_MESSAGE_BOARD_SCALE}
          step={MESSAGE_BOARD_SCALE_STEP}
          value={scale}
          aria-label="Message size"
          onChange={(e) =>
            updateMessageBoard((prev) => ({
              ...prev,
              scale: clampMessageBoardScale(Number.parseFloat(e.target.value)),
            }))
          }
          className="min-w-32 flex-1 accent-teal-500"
        />
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Smaller message"
            disabled={scale <= MIN_MESSAGE_BOARD_SCALE}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                scale: clampMessageBoardScale(
                  (prev.scale ?? DEFAULT_MESSAGE_BOARD_SCALE) -
                    MESSAGE_BOARD_SCALE_STEP,
                ),
              }))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            aria-label="Larger message"
            disabled={scale >= MAX_MESSAGE_BOARD_SCALE}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                scale: clampMessageBoardScale(
                  (prev.scale ?? DEFAULT_MESSAGE_BOARD_SCALE) +
                    MESSAGE_BOARD_SCALE_STEP,
                ),
              }))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-teal-500 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            disabled={scale === DEFAULT_MESSAGE_BOARD_SCALE}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                scale: DEFAULT_MESSAGE_BOARD_SCALE,
              }))
            }
            className="ml-1 inline-flex h-8 items-center rounded-md border border-neutral-600 bg-neutral-800 px-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-4 border-b border-neutral-800 px-8 py-5">
        <label className="min-w-0 flex-1">
          <span className="mb-2.5 block text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            On screen
          </span>
          <AutoTextarea
            value={text}
            maxPx={72}
            aria-label="Message on screen"
            placeholder="Intermission — back in 10 minutes"
            onChange={(e) =>
              updateMessageBoard((prev) => ({
                ...prev,
                text: e.target.value,
                activePresetId:
                  prev.presets.find((preset) => preset.id === prev.activePresetId)
                    ?.text === e.target.value
                    ? prev.activePresetId
                    : null,
              }))
            }
          />
        </label>
        <div className="flex shrink-0 gap-2 pt-7">
          <button
            type="button"
            disabled={!trimmed || alreadySaved || atLimit}
            onClick={savePreset}
            className="h-8 rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
          >
            {alreadySaved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            disabled={!trimmed}
            onClick={() =>
              updateMessageBoard((prev) => ({
                ...prev,
                text: "",
                activePresetId: null,
              }))
            }
            className="h-8 rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-800">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-3 py-2">
            <h2 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
              Groups
            </h2>
            <button
              type="button"
              aria-label="Add group"
              title="Add group"
              disabled={atGroupLimit}
              onClick={() => {
                setGroupDraft("");
                setAddGroupOpen(true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              <FolderPlus size={18} aria-hidden />
            </button>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto p-2">
            <button
              type="button"
              onClick={() => setGroupFilter("all")}
              className={`rounded-md px-2.5 py-2 text-left text-sm font-semibold ${
                groupFilter === "all"
                  ? "bg-teal-600 text-white"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              All
            </button>
            {groups.map((group) => {
              const selected = groupFilter === group.id;
              return (
                <div key={group.id} className="flex items-center gap-1">
                  {renamingGroupId === group.id ? (
                    <input
                      value={renameDraft}
                      aria-label="Rename group"
                      onChange={(event) =>
                        setRenameDraft(
                          event.target.value.slice(0, MAX_MESSAGE_BOARD_GROUP_NAME),
                        )
                      }
                      onBlur={() => {
                        if (skipRenameRef.current) {
                          skipRenameRef.current = false;
                          return;
                        }
                        renameGroup(group.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          renameGroup(group.id);
                        }
                        if (event.key === "Escape") {
                          skipRenameRef.current = true;
                          setRenamingGroupId(null);
                        }
                      }}
                      className="h-8 min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      title="Double-click to rename"
                      onClick={() => setGroupFilter(group.id)}
                      onDoubleClick={() => {
                        setRenamingGroupId(group.id);
                        setRenameDraft(group.name);
                      }}
                      className={`h-8 min-w-0 flex-1 truncate rounded-md px-2.5 text-left text-sm font-semibold ${
                        selected
                          ? "bg-teal-600 text-white"
                          : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      {group.name}
                    </button>
                  )}
                  {selected && renamingGroupId !== group.id ? (
                    <button
                      type="button"
                      aria-label={`Delete ${group.name}`}
                      title="Delete group"
                      onClick={() => deleteGroup(group.id)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-end border-b border-neutral-800 px-8 py-2">
            <button
              type="button"
              aria-label="Add quick message"
              title="Add quick message"
              disabled={atLimit}
              onClick={() => {
                setDraft("");
                setAddMessageOpen(true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              <MessageSquarePlus size={18} aria-hidden />
            </button>
          </div>
      {atLimit ? (
        <p className="shrink-0 px-8 py-2 text-xs text-amber-300">
          Delete a quick message before adding another.
        </p>
      ) : null}

      {presets.length === 0 ? (
        <p className="px-8 py-6 text-sm text-neutral-500">
          No quick messages yet. Use the message button to add one.
        </p>
      ) : visiblePresets.length === 0 ? (
        <p className="px-8 py-6 text-sm text-neutral-500">
          No messages in this group.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-8 py-3">
          {visiblePresets.map((preset) => {
            const index = presets.findIndex((item) => item.id === preset.id);
            const onScreen = activePresetId === preset.id;
            const expanded = expandedId === preset.id;
            return (
              <li
                key={preset.id}
                className={`rounded-lg border px-3 py-2 ${
                  onScreen
                    ? "border-sky-500 bg-sky-950/40"
                    : "border-neutral-800 bg-neutral-900/70 hover:bg-neutral-900"
                }`}
              >
                {expanded ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center">
                      <AutoTextarea
                        value={preset.text}
                        maxPx={160}
                        autoFocus
                        compact
                        aria-label={`Saved message ${index + 1}`}
                        onChange={(e) =>
                          updatePresetText(preset.id, e.target.value)
                        }
                        onBlur={() => {
                          if (preset.text.trim()) return;
                          removePreset(preset.id);
                        }}
                        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                          if (e.key !== "Escape") return;
                          e.preventDefault();
                          setExpandedId(null);
                        }}
                      />
                    </div>
                    <div className="w-36 shrink-0">
                      <Select
                        compact
                        aria-label={`Group for saved message ${index + 1}`}
                        value={preset.groupId ?? "ungrouped"}
                        options={groupOptions}
                        onValueChange={(value) => movePreset(preset.id, value)}
                      />
                    </div>
                    <ShowButton
                      onScreen={onScreen}
                      disabled={!preset.text.trim()}
                      onClick={() => showPreset(preset)}
                    />
                    <RemoveButton
                      index={index}
                      onClick={() => removePreset(preset.id)}
                    />
                    <button
                      type="button"
                      aria-label="Done editing"
                      onClick={() => setExpandedId(null)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-teal-500 bg-teal-600 text-white hover:bg-teal-500"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title={preset.text}
                      onClick={() => setExpandedId(preset.id)}
                      className="flex h-7 min-w-0 flex-1 items-center text-left text-sm text-neutral-100 hover:text-white"
                    >
                      <span className="truncate">
                        {previewText(preset.text)}
                      </span>
                    </button>
                    <div className="w-36 shrink-0">
                      <Select
                        compact
                        aria-label={`Group for saved message ${index + 1}`}
                        value={preset.groupId ?? "ungrouped"}
                        options={groupOptions}
                        onValueChange={(value) => movePreset(preset.id, value)}
                      />
                    </div>
                    <ShowButton
                      onScreen={onScreen}
                      disabled={!preset.text.trim()}
                      onClick={() => showPreset(preset)}
                    />
                    <RemoveButton
                      index={index}
                      onClick={() => removePreset(preset.id)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
        </div>
      </div>

      <PromptDialog
        open={addMessageOpen}
        onOpenChange={setAddMessageOpen}
        title="Add quick message"
        label="Message"
        value={draft}
        onChange={(value) =>
          setDraft(value.slice(0, MAX_MESSAGE_BOARD_PRESET_LENGTH))
        }
        onSubmit={addDraft}
        submitLabel={draftDuplicate ? "Saved" : "Add"}
        placeholder="Add a quick message"
        multiline
        disabled={!draftTrimmed || draftDuplicate || atLimit}
      />
      <PromptDialog
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
        title="Add group"
        label="Group name"
        value={groupDraft}
        onChange={(value) =>
          setGroupDraft(value.slice(0, MAX_MESSAGE_BOARD_GROUP_NAME))
        }
        onSubmit={addGroup}
        submitLabel="Add group"
        placeholder="Group name"
        disabled={!groupDraft.trim() || atGroupLimit}
      />
    </div>
  );
}
