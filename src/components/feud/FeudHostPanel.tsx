"use client";

import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Save,
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  RefreshCw,
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

export function FeudHostPanel() {
  const { state, updateFeud, currentFeudRound } = useSuite();
  const sounds = useSound();
  const feud = state.feud;
  const round = currentFeudRound;
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

  const moveAnswer = (id: string, dir: number) =>
    setRound((r) => {
      const idx = r.answers.findIndex((a) => a.id === id);
      const swap = idx + dir;
      if (swap < 0 || swap >= r.answers.length) return;
      const temp = r.answers[idx];
      r.answers[idx] = r.answers[swap];
      r.answers[swap] = temp;
    });

  const reveal = (id: string) =>
    setRound((r) => {
      const a = r.answers.find((x) => x.id === id);
      if (a && !a.revealed) {
        a.revealed = true;
        sounds.correct();
      }
    });

  const hide = (id: string) =>
    setRound((r) => {
      const a = r.answers.find((x) => x.id === id);
      if (a) a.revealed = false;
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

  const addRound = () =>
    updateFeud((prev) => ({
      ...prev,
      rounds: [
        ...prev.rounds,
        { id: uid(), question: "", strikes: 0, answers: [] },
      ],
      currentRoundIndex: prev.rounds.length,
    }));

  const deleteRound = () => {
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
        "Are you sure you want to reset the entire game? This will hide all answers, clear all strikes, and return to round 1.",
      variant: "danger",
      onConfirm: () => {
        updateFeud((prev) => {
          const copy = structuredClone(prev);
          copy.rounds.forEach((r) => {
            r.answers.forEach((a) => {
              a.revealed = false;
            });
            r.strikes = 0;
          });
          copy.currentRoundIndex = 0;
          return copy;
        });
      },
    });
  };

  const exportJson = () => {
    const json = JSON.stringify(feud, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feud-game-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as FeudGameState;
        if (parsed.rounds && Array.isArray(parsed.rounds)) {
          updateFeud(() => ({
            ...parsed,
            showHeader: parsed.showHeader ?? true,
          }));
        } else {
          alert("Invalid game file.");
        }
      } catch {
        alert("Failed to parse JSON");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 500px) 1fr",
          flexShrink: 0,
          background: "#1f1f1f",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderRight: "1px solid #3a3a3a",
            borderBottom: "1px solid #3a3a3a",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: "#e5e5e5", marginBottom: 8 }}>
            Round
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Select
              value={feud.currentRoundIndex.toString()}
              onValueChange={(value) =>
                updateFeud((prev) => ({
                  ...prev,
                  currentRoundIndex: Number.parseInt(value, 10),
                }))
              }
              options={feud.rounds.map((r, i) => ({
                value: i.toString(),
                label: `${i + 1}. ${r.question?.slice(0, 40) || "(untitled)"}`,
              }))}
            />
            <Tooltip content="Add Round">
              <IconButton label={<Plus size={16} />} onClick={addRound} />
            </Tooltip>
            <Tooltip content="Delete Round">
              <IconButton label={<Trash2 size={16} />} onClick={deleteRound} />
            </Tooltip>
          </div>
        </div>
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #3a3a3a",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: "#e5e5e5", marginBottom: 8 }}>
            Question
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <TextInput
              value={round.question}
              onChange={(v) => setRound((r) => {
                r.question = v;
              })}
              placeholder="Type the survey question..."
              style={{ flex: 1, minWidth: 160 }}
            />
            <Tooltip
              content={
                feud.showHeader
                  ? "Hide question on audience display"
                  : "Show question on audience display"
              }
            >
              <IconButton
                label={feud.showHeader ? <Eye size={16} /> : <EyeOff size={16} />}
                onClick={() =>
                  updateFeud((prev) => ({ ...prev, showHeader: !prev.showHeader }))
                }
              />
            </Tooltip>
            <Tooltip content="Load Game">
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 8px",
                  border: "1px solid #3a3a3a",
                  borderRadius: 8,
                  background: "#2a2a2a",
                  color: "#e5e5e5",
                  cursor: "pointer",
                }}
              >
                <Upload size={16} />
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    e.target.files?.[0] && importJson(e.target.files[0])
                  }
                />
              </label>
            </Tooltip>
            <Tooltip content="Save Game">
              <IconButton label={<Save size={16} />} onClick={exportJson} />
            </Tooltip>
            <button
              type="button"
              onClick={resetRound}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-sm font-medium text-neutral-200"
            >
              <RotateCcw size={16} /> Reset Round
            </button>
            <button
              type="button"
              onClick={resetGame}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-sm font-medium text-neutral-200"
            >
              <RefreshCw size={16} /> Reset Game
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 500px) 1fr",
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
            <div style={{ fontWeight: 600, fontSize: 14, color: "#e5e5e5", marginBottom: 8 }}>
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
                <IconButton label="Add Strike" onClick={addStrike} />
                <IconButton
                  label="Remove Strike"
                  onClick={removeStrike}
                  disabled={!round.strikes}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: "#e5e5e5" }}>
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
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ display: "grid", gap: 5 }}>
                {round.answers.map((a, index) => (
                  <div
                    key={a.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "26px 26px 1fr 56px auto",
                      gap: 6,
                      alignItems: "center",
                      padding: "5px 6px",
                      borderRadius: 6,
                      background: a.revealed ? "#1a3a2a" : "#1f1f1f",
                      border: `1px solid ${a.revealed ? "#4a8a6a" : "#3a3a3a"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Tooltip content="Move Up">
                        <IconButton
                          label={<ChevronUp size={14} />}
                          onClick={() => moveAnswer(a.id, -1)}
                          style={{ marginRight: 0, padding: "1px 3px", minHeight: 22, width: 24 }}
                        />
                      </Tooltip>
                      <Tooltip content="Move Down">
                        <IconButton
                          label={<ChevronDown size={14} />}
                          onClick={() => moveAnswer(a.id, +1)}
                          style={{ marginRight: 0, padding: "1px 3px", minHeight: 22, width: 24 }}
                        />
                      </Tooltip>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#e5e5e5",
                      }}
                    >
                      {index + 1}
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
                    />
                    <NumberInput
                      value={a.points}
                      onChange={(v) =>
                        setRound((r) => {
                          const aa = r.answers.find((x) => x.id === a.id);
                          if (aa) aa.points = v;
                        })
                      }
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {!a.revealed ? (
                        <IconButton
                          label="Reveal"
                          onClick={() => reveal(a.id)}
                          style={{ marginRight: 0, padding: "6px 8px", fontSize: 12 }}
                        />
                      ) : (
                        <IconButton
                          label="Hide"
                          onClick={() => hide(a.id)}
                          style={{ marginRight: 0, padding: "6px 8px", fontSize: 12 }}
                        />
                      )}
                      <Tooltip content="Delete Answer">
                        <IconButton
                          label={<Trash2 size={14} />}
                          onClick={() => removeAnswer(a.id)}
                          style={{ marginRight: 0, padding: "6px 6px" }}
                        />
                      </Tooltip>
                    </div>
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
          <div className="host-embed" style={{ width: "100%", height: "100%" }}>
            <FeudAudienceView
              round={round}
              showHeader={feud.showHeader}
              embedded
            />
          </div>
        </div>
      </div>

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
