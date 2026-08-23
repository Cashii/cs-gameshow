"use client";

import { useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Trash2,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  RotateCcw,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { useSound } from "@/lib/feud/useSound";
import { clamp, uid } from "@/lib/utils";
import type { FeudAnswer, FeudGameState, FeudRound } from "@/lib/feud/types";
import { IconButton, NumberInput, TextInput } from "@/components/ui/Primitives";
import { Tooltip } from "@/components/ui/Tooltip";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FeudAudienceView } from "./FeudAudienceView";

const ghostIconButtonStyle: CSSProperties = {
  marginRight: 0,
  height: 36,
  width: 36,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#a3a3a3",
};

export function FeudHostPanel() {
  const { state, updateFeud, currentFeudRound } = useSuite();
  const sounds = useSound();
  const feud = state.feud;
  const round = currentFeudRound;
  const [dragAnswerId, setDragAnswerId] = useState<string | null>(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState<"add" | "edit">(
    "add",
  );
  const [questionDraft, setQuestionDraft] = useState("");
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "default" | "danger";
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  if (!round) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-500">
        No round loaded.
      </div>
    );
  }

  const setRound = (updater: (r: FeudRound, all: FeudGameState) => void) => {
    updateFeud((prev) => {
      const copy = structuredClone(prev);
      updater(copy.rounds[copy.currentRoundIndex], copy);
      return copy;
    });
  };

  const addAnswer = () =>
    setRound((r) => {
      const newAnswer: FeudAnswer = {
        id: uid(),
        text: "",
        points: 0,
        revealed: false,
      };
      r.answers.push(newAnswer);
    });

  const removeAnswer = (id: string) =>
    setRound((r) => {
      r.answers = r.answers.filter((a) => a.id !== id);
    });

  const reorderAnswer = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setRound((r) => {
      const from = r.answers.findIndex((a) => a.id === fromId);
      const to = r.answers.findIndex((a) => a.id === toId);
      if (from < 0 || to < 0) return;
      const [item] = r.answers.splice(from, 1);
      r.answers.splice(to, 0, item);
    });
  };

  const creditTeam = (
    all: FeudGameState,
    side: "left" | "right",
    delta: number,
  ) => {
    const team = side === "left" ? all.leftTeam : all.rightTeam;
    team.score = Math.max(0, team.score + delta);
  };

  const reveal = (id: string) =>
    setRound((r, all) => {
      const a = r.answers.find((x) => x.id === id);
      if (a && !a.revealed) {
        a.revealed = true;
        a.awardedTo = all.awardTeam === "right" ? "right" : "left";
        creditTeam(all, a.awardedTo, a.points || 0);
        sounds.correct();
      }
    });

  const hide = (id: string) =>
    setRound((r, all) => {
      const a = r.answers.find((x) => x.id === id);
      if (a && a.revealed) {
        if (a.awardedTo) {
          creditTeam(all, a.awardedTo, -(a.points || 0));
        }
        a.revealed = false;
        a.awardedTo = undefined;
      }
    });

  const addStrike = () => {
    setRound((r) => {
      r.strikes = clamp((r.strikes || 0) + 1, 0, 3);
    });
    sounds.wrong();
  };

  const removeStrike = () =>
    setRound((r) => {
      r.strikes = clamp((r.strikes || 0) - 1, 0, 3);
    });

  const openAddRound = () => {
    setQuestionDialogMode("add");
    setQuestionDraft("");
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = () => {
    setQuestionDialogMode("edit");
    setQuestionDraft(round.question ?? "");
    setQuestionDialogOpen(true);
  };

  const saveQuestionDialog = () => {
    const question = questionDraft.trim();
    if (!question) return;
    if (questionDialogMode === "add") {
      updateFeud((prev) => ({
        ...prev,
        rounds: [
          ...prev.rounds,
          { id: uid(), question, strikes: 0, answers: [] },
        ],
        currentRoundIndex: prev.rounds.length,
      }));
    } else {
      setRound((r) => {
        r.question = question;
      });
    }
    setQuestionDraft("");
    setQuestionDialogOpen(false);
  };

  const deleteRound = () => {
    setQuestionDialogOpen(false);
    setConfirm({
      open: true,
      title: "Delete Round",
      message: "Are you sure you want to delete this round? This cannot be undone.",
      variant: "danger",
      onConfirm: () => {
        updateFeud((prev) => {
          if (prev.rounds.length <= 1) return prev;
          const idx = prev.currentRoundIndex;
          const rounds = prev.rounds.filter((_, i) => i !== idx);
          return {
            ...prev,
            rounds,
            currentRoundIndex: Math.max(0, Math.min(idx - 1, rounds.length - 1)),
          };
        });
      },
    });
  };

  const resetRound = () => {
    setConfirm({
      open: true,
      title: "Reset Round",
      message:
        "Are you sure you want to reset this round? This will hide all answers and clear strikes.",
      variant: "danger",
      onConfirm: () => {
        setRound((r) => {
          r.answers.forEach((a) => {
            a.revealed = false;
            a.awardedTo = undefined;
          });
          r.strikes = 0;
        });
      },
    });
  };

  const resetGame = () => {
    setConfirm({
      open: true,
      title: "Reset Game",
      message:
        "Are you sure you want to reset the entire game? This will hide all answers, clear all strikes, reset team scores, and return to round 1.",
      variant: "danger",
      onConfirm: () => {
        updateFeud((prev) => {
          const copy = structuredClone(prev);
          copy.rounds.forEach((r) => {
            r.answers.forEach((a) => {
              a.revealed = false;
              a.awardedTo = undefined;
            });
            r.strikes = 0;
          });
          copy.currentRoundIndex = 0;
          copy.leftTeam = { ...copy.leftTeam, score: 0 };
          copy.rightTeam = { ...copy.rightTeam, score: 0 };
          return copy;
        });
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900/90 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          <button
            type="button"
            onClick={resetRound}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-500 bg-neutral-600 px-4 text-sm font-semibold text-white hover:bg-neutral-500"
          >
            <RotateCcw size={16} /> Reset Round
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw size={16} /> Reset Game
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "480px minmax(0, 1fr)",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            borderRight: "1px solid #3a3a3a",
            background: "#1a1a1a",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #3a3a3a",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16, color: "#e5e5e5" }}>
                Teams
              </div>
              <Tooltip
                content={
                  feud.showTeamScores
                    ? "Hide teams on audience"
                    : "Show teams on audience"
                }
              >
                <IconButton
                  label={feud.showTeamScores ? <Eye size={16} /> : <EyeOff size={16} />}
                  onClick={() =>
                    updateFeud((prev) => ({
                      ...prev,
                      showTeamScores: !prev.showTeamScores,
                    }))
                  }
                  style={{ marginRight: 0 }}
                />
              </Tooltip>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1px 1fr",
                gap: 16,
                alignItems: "start",
              }}
            >
              {(["leftTeam", "rightTeam"] as const).map((key, i) => {
                const team = feud[key];
                const label = key === "leftTeam" ? "Left" : "Right";
                return (
                  <div key={key} style={{ display: "contents" }}>
                    {i === 1 && (
                      <div
                        aria-hidden
                        style={{
                          width: 1,
                          alignSelf: "stretch",
                          background: "#3a3a3a",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: "#a3a3a3",
                          }}
                        >
                          Name
                        </label>
                        <TextInput
                          value={team.name}
                          onChange={(v) =>
                            updateFeud((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], name: v },
                            }))
                          }
                          placeholder={`${label} team`}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: "#a3a3a3",
                          }}
                        >
                          Score
                        </label>
                        <NumberInput
                          value={team.score}
                          min={0}
                          max={99999}
                          style={{ width: "100%" }}
                          onChange={(v) =>
                            updateFeud((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                score: Math.max(0, Number(v) || 0),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #3a3a3a",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16, color: "#e5e5e5", marginBottom: 8 }}>
              Strikes
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 4, fontSize: 24, fontWeight: 700 }}>
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    style={{
                      color: index < (round.strikes || 0) ? "#ef4444" : "#4a4a4a",
                    }}
                  >
                    X
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <IconButton
                  label="Add Strike"
                  onClick={addStrike}
                  style={{ marginRight: 0 }}
                />
                <IconButton
                  label="Remove Strike"
                  onClick={removeStrike}
                  disabled={!round.strikes}
                  style={{ marginRight: 0 }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              padding: "16px 24px",
              overflow: "hidden",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, color: "#e5e5e5" }}>
                  Answers
                </div>
                <Tooltip content="Add Answer">
                  <IconButton
                    label={<Plus size={16} />}
                    onClick={addAnswer}
                    style={{ marginRight: 0 }}
                  />
                </Tooltip>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#a3a3a3",
                    whiteSpace: "nowrap",
                  }}
                >
                  Award to
                </span>
                {(["left", "right"] as const).map((side) => {
                  const selected = (feud.awardTeam ?? "left") === side;
                  const name =
                    side === "left"
                      ? feud.leftTeam.name || "Left"
                      : feud.rightTeam.name || "Right";
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() =>
                        updateFeud((prev) => ({ ...prev, awardTeam: side }))
                      }
                      style={{
                        height: 32,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: selected
                          ? side === "left"
                            ? "1px solid #fb7185"
                            : "1px solid #60a5fa"
                          : "1px solid #3a3a3a",
                        background: selected
                          ? side === "left"
                            ? "#3f1d27"
                            : "#1e3a5f"
                          : "#2a2a2a",
                        color: selected ? "#e5e5e5" : "#a3a3a3",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflowX: "hidden",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                {round.answers.map((a, index) => (
                  <div
                    key={a.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId = e.dataTransfer.getData("text/plain");
                      if (fromId) reorderAnswer(fromId, a.id);
                      setDragAnswerId(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      minWidth: 0,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      padding: "1px 0",
                      borderLeft: a.revealed
                        ? `3px solid ${
                            a.awardedTo === "right" ? "#60a5fa" : "#fb7185"
                          }`
                        : "3px solid transparent",
                      opacity: dragAnswerId === a.id ? 0.7 : 1,
                      outline:
                        dragAnswerId === a.id ? "1px solid #60a5fa" : undefined,
                      outlineOffset: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        draggable
                        aria-label={`Reorder answer ${index + 1}`}
                        title="Drag to reorder"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", a.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragAnswerId(a.id);
                        }}
                        onDragEnd={() => setDragAnswerId(null)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 36,
                          width: 14,
                          border: "none",
                          background: "transparent",
                          color: "#a3a3a3",
                          cursor: "grab",
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        <GripVertical size={14} />
                      </button>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 36,
                          fontWeight: 600,
                          fontSize: 16,
                          lineHeight: 1,
                          color: a.revealed
                            ? a.awardedTo === "right"
                              ? "#93c5fd"
                              : "#fda4af"
                            : "#a3a3a3",
                          textAlign: "center",
                        }}
                      >
                        {index + 1}
                      </div>
                    </div>
                    <TextInput
                      value={a.text}
                      onChange={(v) =>
                        setRound((r) => {
                          const aa = r.answers.find((x) => x.id === a.id);
                          if (aa) aa.text = v;
                        })
                      }
                      placeholder="Answer text"
                      style={{ width: 0, flex: "1 1 0%", minWidth: 0 }}
                    />
                    <NumberInput
                      value={a.points}
                      disabled={!feud.showAnswerScores}
                      className="no-spin"
                      style={{
                        flexShrink: 0,
                        width: 56,
                        minWidth: 56,
                        textAlign: "center",
                        padding: 0,
                        appearance: "textfield",
                      }}
                      onChange={(v) =>
                        setRound((r) => {
                          const aa = r.answers.find((x) => x.id === a.id);
                          if (aa) aa.points = v;
                        })
                      }
                    />
                    {!a.revealed ? (
                      <IconButton
                        label="Reveal"
                        onClick={() => reveal(a.id)}
                        style={{
                          marginRight: 0,
                          height: 36,
                          width: 80,
                          minWidth: 80,
                          padding: 0,
                          fontWeight: 400,
                          flexShrink: 0,
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <IconButton
                        label="Hide"
                        onClick={() => hide(a.id)}
                        style={{
                          marginRight: 0,
                          height: 36,
                          width: 80,
                          minWidth: 80,
                          padding: 0,
                          fontWeight: 400,
                          flexShrink: 0,
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                    <Tooltip content="Delete Answer">
                      <IconButton
                        label={<Trash2 size={16} />}
                        onClick={() => removeAnswer(a.id)}
                        style={{
                          marginRight: 0,
                          height: 36,
                          width: 36,
                          padding: 0,
                          flexShrink: 0,
                          boxSizing: "border-box",
                        }}
                      />
                    </Tooltip>
                  </div>
                ))}
                {round.answers.length === 0 && (
                  <div style={{ textAlign: "center", color: "#666", padding: "40px 20px" }}>
                    No answers yet. Click the add button to add one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#0f0f0f",
            padding: 20,
          }}
        >
          <div
            className="mb-3 shrink-0"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Select
                aria-label="Question"
                value={feud.currentRoundIndex.toString()}
                onValueChange={(value) => {
                  const nextIndex = Number.parseInt(value, 10);
                  if (nextIndex === feud.currentRoundIndex) return;
                  updateFeud((prev) => ({
                    ...prev,
                    currentRoundIndex: nextIndex,
                  }));
                }}
                options={feud.rounds.map((r, i) => ({
                  value: i.toString(),
                  label: `${i + 1}. ${r.question?.slice(0, 40) || "(untitled)"}`,
                }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <Tooltip content="Add Round">
                <IconButton
                  className="hover:bg-neutral-800 hover:text-white"
                  label={<Plus size={18} />}
                  onClick={openAddRound}
                  style={ghostIconButtonStyle}
                />
              </Tooltip>
              <Tooltip content="Edit Question">
                <IconButton
                  className="hover:bg-neutral-800 hover:text-white"
                  label={<Pencil size={18} />}
                  onClick={openEditQuestion}
                  style={ghostIconButtonStyle}
                />
              </Tooltip>
              <Tooltip
                delayDuration={0}
                content={
                  feud.showHeader
                    ? "Hides the question on the audience display"
                    : "Shows the question on the audience display"
                }
              >
                <IconButton
                  className="hover:bg-neutral-800 hover:text-white"
                  label={feud.showHeader ? <Eye size={18} /> : <EyeOff size={18} />}
                  onClick={() =>
                    updateFeud((prev) => ({ ...prev, showHeader: !prev.showHeader }))
                  }
                  style={ghostIconButtonStyle}
                />
              </Tooltip>
            </div>
          </div>
          <div
            className="host-embed"
            style={{ width: "100%", flex: "1 1 auto", minHeight: 0 }}
          >
            <FeudAudienceView
              round={round}
              showHeader={feud.showHeader}
              leftTeam={feud.leftTeam}
              rightTeam={feud.rightTeam}
              showTeamScores={feud.showTeamScores}
              showAnswerScores={feud.showAnswerScores}
              embedded
            />
          </div>
        </div>
      </div>

      <Dialog.Root
        open={questionDialogOpen}
        onOpenChange={(open) => {
          setQuestionDialogOpen(open);
          if (!open) setQuestionDraft("");
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
            <Dialog.Title className="mb-2 text-lg font-semibold text-white">
              {questionDialogMode === "add" ? "New Round" : "Edit Question"}
            </Dialog.Title>
            <Dialog.Description className="mb-4 text-sm text-neutral-400">
              {questionDialogMode === "add"
                ? "Enter the survey question for this round."
                : "Update the survey question for this round."}
            </Dialog.Description>
            <input
              type="text"
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveQuestionDialog();
              }}
              placeholder="Type the survey question..."
              className="mb-4 w-full rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between gap-3">
              {questionDialogMode === "edit" ? (
                <button
                  type="button"
                  onClick={deleteRound}
                  disabled={feud.rounds.length <= 1}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                    feud.rounds.length <= 1
                      ? "cursor-not-allowed border-neutral-800 text-neutral-600"
                      : "border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-950/70"
                  }`}
                >
                  <Trash2 size={14} />
                  Delete Round
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={saveQuestionDialog}
                  disabled={!questionDraft.trim()}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                    questionDraft.trim()
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                  }`}
                >
                  {questionDialogMode === "add" ? "Create Round" : "Save"}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm({ ...confirm, open })}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        variant={confirm.variant}
      />
    </div>
  );
}
