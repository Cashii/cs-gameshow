"use client";

import { useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Trash2,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  GripVertical,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { useSound } from "@/lib/feud/useSound";
import { clamp, uid } from "@/lib/utils";
import type { FeudAnswer, FeudGameState, FeudRound } from "@/lib/feud/types";
import { IconButton, NumberInput, TextInput } from "@/components/ui/Primitives";
import { Tooltip } from "@/components/ui/Tooltip";
import { SpectatorScreenNotice } from "@/components/operator/OperatorNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ResetButton } from "@/components/ui/ResetButton";
import { FeudAudienceView } from "./FeudAudienceView";

const RED_TEAM = "#dc2626";
const BLUE_TEAM = "#2563eb";
const RED_TEAM_INK = "#b91c1c";
const BLUE_TEAM_INK = "#1d4ed8";

const ghostIconButtonStyle: CSSProperties = {
  marginRight: 0,
  height: 36,
  width: 36,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--color-neutral-400)",
};

export function FeudHostPanel() {
  const { state, updateFeud, currentFeudRound } = useSuite();
  const spectatorLive = state.spectatorGame === "feud";
  const sounds = useSound();
  const feud = state.feud;
  const round = currentFeudRound;
  const [dragAnswerId, setDragAnswerId] = useState<string | null>(null);
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDialogMode, setQuestionDialogMode] = useState<"add" | "edit">(
    "add",
  );
  const [questionDraft, setQuestionDraft] = useState("");
  const [pickerForm, setPickerForm] = useState<
    | { mode: "add"; draft: string }
    | { mode: "edit"; id: string; draft: string }
    | null
  >(null);
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
        if (all.awardTeam === "none") {
          a.awardedTo = undefined;
        } else {
          a.awardedTo = all.awardTeam === "right" ? "right" : "left";
          creditTeam(all, a.awardedTo, a.points || 0);
        }
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
  };

  const removeStrike = () =>
    setRound((r) => {
      r.strikes = clamp((r.strikes || 0) - 1, 0, 3);
    });

  const flashSoloStrike = () => {
    updateFeud((prev) => ({
      ...prev,
      soloStrikeFlash: (prev.soloStrikeFlash ?? 0) + 1,
    }));
  };

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

  const removeRoundById = (id: string) => {
    setPickerForm((form) =>
      form?.mode === "edit" && form.id === id ? null : form,
    );
    updateFeud((prev) => {
      if (prev.rounds.length <= 1) return prev;
      const idx = prev.rounds.findIndex((item) => item.id === id);
      if (idx < 0) return prev;
      const rounds = prev.rounds.filter((item) => item.id !== id);
      let currentRoundIndex = prev.currentRoundIndex;
      if (idx < currentRoundIndex) currentRoundIndex -= 1;
      else if (idx === currentRoundIndex) {
        currentRoundIndex = Math.min(idx, rounds.length - 1);
      }
      return { ...prev, rounds, currentRoundIndex };
    });
  };

  const deleteRound = () => {
    const id = round.id;
    setQuestionDialogOpen(false);
    setConfirm({
      open: true,
      title: "Delete Round",
      message: "Are you sure you want to delete this round? This cannot be undone.",
      variant: "danger",
      onConfirm: () => removeRoundById(id),
    });
  };

  const requestDeleteRound = (id: string) => {
    if (feud.rounds.length <= 1) return;
    setConfirm({
      open: true,
      title: "Delete question",
      message: "Are you sure you want to delete this question? This cannot be undone.",
      variant: "danger",
      onConfirm: () => removeRoundById(id),
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

  const selectRound = (index: number) => {
    if (index !== feud.currentRoundIndex) {
      updateFeud((prev) => ({
        ...prev,
        currentRoundIndex: index,
      }));
    }
    setQuestionPickerOpen(false);
  };

  const savePickerForm = () => {
    if (!pickerForm) return;
    const question = pickerForm.draft.trim();
    if (!question) return;
    if (pickerForm.mode === "add") {
      updateFeud((prev) => ({
        ...prev,
        rounds: [
          ...prev.rounds,
          { id: uid(), question, strikes: 0, answers: [] },
        ],
        currentRoundIndex: prev.rounds.length,
      }));
    } else {
      const id = pickerForm.id;
      updateFeud((prev) => {
        const copy = structuredClone(prev);
        const target = copy.rounds.find((item) => item.id === id);
        if (target) target.question = question;
        return copy;
      });
    }
    setPickerForm(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Game actions
          </span>
          <ResetButton onClick={resetRound}>Reset Round</ResetButton>
          <ResetButton onClick={resetGame}>Reset Game</ResetButton>
        </div>
      </div>

      {!spectatorLive && (
        <SpectatorScreenNotice>
          Spectator is not on Friendly Feud. Use the Spectator screen list so
          the projector shows the board.
        </SpectatorScreenNotice>
      )}

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
            borderRight: "1px solid var(--color-neutral-700)",
            background: "var(--color-neutral-900)",
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
              borderBottom: "1px solid var(--color-neutral-700)",
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
              <div style={{ fontWeight: 600, fontSize: 16, color: "var(--color-white)" }}>
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
                const isRed = key === "leftTeam";
                const label = isRed ? "Red" : "Blue";
                return (
                  <div key={key} style={{ display: "contents" }}>
                    {i === 1 && (
                      <div
                        aria-hidden
                        style={{
                          width: 1,
                          alignSelf: "stretch",
                          background: "var(--color-neutral-700)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: 12,
                        borderRadius: 12,
                        background: isRed
                          ? "rgba(220, 38, 38, 0.14)"
                          : "rgba(37, 99, 235, 0.14)",
                        border: `2px solid ${isRed ? RED_TEAM : BLUE_TEAM}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: isRed ? RED_TEAM_INK : BLUE_TEAM_INK,
                        }}
                      >
                        {label} team
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
                            color: "var(--color-neutral-400)",
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
                            color: "var(--color-neutral-400)",
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
              borderBottom: "1px solid var(--color-neutral-700)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16, color: "var(--color-white)", marginBottom: 8 }}>
              Strikes
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 4, fontSize: 24, fontWeight: 700 }}>
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    style={{
                      color: index < (round.strikes || 0) ? "#ef4444" : "var(--color-neutral-600)",
                    }}
                  >
                    X
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                <IconButton
                  label="Single Strike"
                  onClick={flashSoloStrike}
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
                <div style={{ fontWeight: 600, fontSize: 16, color: "var(--color-white)" }}>
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
                    color: "var(--color-neutral-400)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Award to
                </span>
                {(["left", "right", "none"] as const).map((side) => {
                  const selected = (feud.awardTeam ?? "left") === side;
                  let name = "No one";
                  let border = "#737373";
                  let ink = "#525252";
                  let tint = "rgba(82, 82, 82, 0.1)";
                  if (side === "left") {
                    name = feud.leftTeam.name || "Red";
                    border = RED_TEAM;
                    ink = RED_TEAM_INK;
                    tint = "rgba(220, 38, 38, 0.12)";
                  } else if (side === "right") {
                    name = feud.rightTeam.name || "Blue";
                    border = BLUE_TEAM;
                    ink = BLUE_TEAM_INK;
                    tint = "rgba(37, 99, 235, 0.12)";
                  }
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updateFeud((prev) => ({ ...prev, awardTeam: side }))
                      }
                      style={{
                        height: 32,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: `2px solid ${border}`,
                        background: selected ? tint : "transparent",
                        color: ink,
                        fontSize: 12,
                        fontWeight: selected ? 700 : 600,
                        boxShadow: selected ? `inset 0 0 0 1px ${border}` : undefined,
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
                            a.awardedTo === "right"
                              ? BLUE_TEAM
                              : a.awardedTo === "left"
                                ? RED_TEAM
                                : "#a3a3a3"
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
                          color: "var(--color-neutral-400)",
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
                              ? BLUE_TEAM_INK
                              : a.awardedTo === "left"
                                ? RED_TEAM_INK
                                : "var(--color-neutral-300)"
                            : "var(--color-neutral-400)",
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
                          fontWeight: 600,
                          flexShrink: 0,
                          boxSizing: "border-box",
                          border: "1px solid var(--color-emerald-500)",
                          background: "transparent",
                          color: "var(--color-emerald-400)",
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
                          fontWeight: 600,
                          flexShrink: 0,
                          boxSizing: "border-box",
                          border: "1px solid #52525b",
                          background: "#3f3f46",
                          color: "#fafafa",
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
                  <div style={{ textAlign: "center", color: "var(--color-neutral-500)", padding: "40px 20px" }}>
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
            background: "var(--color-neutral-950)",
            padding: 20,
          }}
        >
          <div
            className="mb-3 shrink-0"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                aria-label="Question"
                aria-haspopup="dialog"
                onClick={() => setQuestionPickerOpen(true)}
                className="inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-800 py-0 pr-3 pl-3 text-left text-base font-normal text-white hover:bg-neutral-700"
              >
                <span className="min-w-0 flex-1 truncate">
                  {`${feud.currentRoundIndex + 1}. ${round.question?.trim() || "(untitled)"}`}
                </span>
                <ChevronDown size={16} className="shrink-0 text-neutral-400" aria-hidden />
              </button>
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
                <button
                  type="button"
                  aria-label={
                    feud.showHeader ? "Hide question" : "Show question"
                  }
                  aria-pressed={feud.showHeader}
                  onClick={() =>
                    updateFeud((prev) => ({
                      ...prev,
                      showHeader: !prev.showHeader,
                    }))
                  }
                  className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
                    feud.showHeader
                      ? "border-sky-500 bg-sky-600 text-white hover:bg-sky-500"
                      : "border-sky-500 bg-transparent text-sky-300 hover:bg-sky-500/10"
                  }`}
                >
                  {feud.showHeader ? (
                    <Eye size={20} aria-hidden />
                  ) : (
                    <EyeOff size={20} aria-hidden />
                  )}
                  {feud.showHeader ? "Hide question" : "Show question"}
                </button>
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
              soloStrikeFlash={feud.soloStrikeFlash ?? 0}
              embedded
            />
          </div>
        </div>
      </div>

      <Dialog.Root
        open={questionPickerOpen}
        onOpenChange={(open) => {
          setQuestionPickerOpen(open);
          if (!open) setPickerForm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[min(85vh,800px)] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
            onEscapeKeyDown={(event) => {
              if (!pickerForm) return;
              event.preventDefault();
              setPickerForm(null);
            }}
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Questions
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-neutral-400">
                  Pick a question to show on the board. Add, edit, or delete questions here.
                </Dialog.Description>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerForm({ mode: "add", draft: "" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  <Plus size={16} />
                  Add question
                </button>
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
            </div>
            {pickerForm?.mode === "add" ? (
              <form
                className="mx-6 mb-3 flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  savePickerForm();
                }}
              >
                <input
                  value={pickerForm.draft}
                  onChange={(event) =>
                    setPickerForm({ mode: "add", draft: event.target.value })
                  }
                  placeholder="Type the survey question..."
                  aria-label="New question"
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerForm(null)}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pickerForm.draft.trim()}
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                    pickerForm.draft.trim()
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                  }`}
                >
                  Add
                </button>
              </form>
            ) : null}
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-6">
              {feud.rounds.map((item, index) => {
                const selected = index === feud.currentRoundIndex;
                const editing =
                  pickerForm?.mode === "edit" && pickerForm.id === item.id;
                const summary =
                  item.answers.length === 0
                    ? "No answers yet"
                    : item.answers
                        .map(
                          (answer) =>
                            `${answer.text.trim() || "(blank)"} ${answer.points}`,
                        )
                        .join(" · ");
                const rowClass = selected
                  ? "border-sky-500 bg-sky-950/40"
                  : "border-neutral-700 bg-neutral-800/60";
                return (
                  <li
                    key={item.id}
                    className={`flex items-start gap-1 rounded-lg border pr-1 ${rowClass}`}
                  >
                    {editing && pickerForm?.mode === "edit" ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          savePickerForm();
                        }}
                      >
                        <span className="w-5 shrink-0 text-sm font-semibold text-neutral-400">
                          {index + 1}
                        </span>
                        <input
                          value={pickerForm.draft}
                          onChange={(event) =>
                            setPickerForm({
                              mode: "edit",
                              id: item.id,
                              draft: event.target.value,
                            })
                          }
                          aria-label="Edit question"
                          autoFocus
                          className="min-w-0 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPickerForm(null)}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!pickerForm.draft.trim()}
                          className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                            pickerForm.draft.trim()
                              ? "bg-blue-600 hover:bg-blue-500"
                              : "cursor-not-allowed bg-neutral-700 text-neutral-500"
                          }`}
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => selectRound(index)}
                        aria-current={selected ? "true" : undefined}
                        className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left"
                      >
                        <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-neutral-400">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-white">
                            {item.question.trim() || "(untitled)"}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                            {summary}
                          </span>
                        </span>
                        {selected ? (
                          <Check size={16} className="mt-0.5 shrink-0 text-sky-400" aria-hidden />
                        ) : null}
                      </button>
                    )}
                    {editing ? null : (
                      <div className="flex shrink-0 items-center gap-0.5 pt-2">
                        <button
                          type="button"
                          aria-label={`Edit question ${index + 1}`}
                          onClick={() =>
                            setPickerForm({
                              mode: "edit",
                              id: item.id,
                              draft: item.question ?? "",
                            })
                          }
                          className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete question ${index + 1}`}
                          disabled={feud.rounds.length <= 1}
                          onClick={() => requestDeleteRound(item.id)}
                          className={`rounded-md p-2 ${
                            feud.rounds.length <= 1
                              ? "cursor-not-allowed text-neutral-600"
                              : "text-neutral-400 hover:bg-neutral-800 hover:text-red-300"
                          }`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
