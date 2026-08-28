"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { useSound } from "@/lib/feud/useSound";
import {
  createEmptyCategory,
  createEmptyClue,
  createEmptyContestant,
  DEFAULT_CLUE_VALUES,
} from "@/lib/jeoparody/defaults";
import { findClue } from "@/lib/jeoparody/types";
import type { JeoparodyGameState } from "@/lib/jeoparody/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Tab = "play" | "setup";

export function JeoparodyHostPanel() {
  const { state, updateJeoparody } = useSuite();
  const sounds = useSound();
  const game = state.jeoparody;
  const [tab, setTab] = useState<Tab>("play");
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

  const selected = useMemo(
    () => findClue(game, game.selectedClueId),
    [game],
  );

  const patch = (updater: (prev: JeoparodyGameState) => JeoparodyGameState) => {
    updateJeoparody(updater);
  };

  const openClue = (clueId: string) => {
    patch((prev) => ({
      ...prev,
      selectedClueId: clueId,
      phase: "clue",
      categories: prev.categories.map((category) => ({
        ...category,
        clues: category.clues.map((clue) =>
          clue.id === clueId ? { ...clue, played: true } : clue,
        ),
      })),
    }));
  };

  const backToBoard = () => {
    patch((prev) => ({
      ...prev,
      selectedClueId: null,
      phase: "board",
    }));
  };

  const setPhase = (phase: "clue" | "answer") => {
    patch((prev) => ({ ...prev, phase }));
  };

  const adjustScore = (contestantId: string, delta: number) => {
    patch((prev) => ({
      ...prev,
      contestants: prev.contestants.map((contestant) =>
        contestant.id === contestantId
          ? { ...contestant, score: contestant.score + delta }
          : contestant,
      ),
    }));
  };

  const award = (contestantId: string, correct: boolean) => {
    const value = selected?.clue.value ?? 0;
    if (!value) return;
    if (correct) sounds.correct();
    else sounds.wrong();
    adjustScore(contestantId, correct ? value : -value);
  };

  const resetBoard = () => {
    patch((prev) => ({
      ...prev,
      selectedClueId: null,
      phase: "board",
      categories: prev.categories.map((category) => ({
        ...category,
        clues: category.clues.map((clue) => ({ ...clue, played: false })),
      })),
    }));
  };

  const resetScores = () => {
    patch((prev) => ({
      ...prev,
      contestants: prev.contestants.map((contestant) => ({
        ...contestant,
        score: 0,
      })),
    }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <div className="flex rounded-md border border-neutral-700 p-0.5">
          {(["play", "setup"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded px-3 py-1.5 text-sm font-semibold capitalize ${
                tab === id
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setConfirm({
              open: true,
              title: "Reset board",
              message: "Unplay every clue and return to the board?",
              onConfirm: resetBoard,
            })
          }
          className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-500 bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500"
        >
          <RotateCcw size={16} /> Reset board
        </button>
        <button
          type="button"
          onClick={() =>
            setConfirm({
              open: true,
              title: "Reset scores",
              message: "Set every contestant score to 0?",
              onConfirm: resetScores,
              variant: "danger",
            })
          }
          className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw size={16} /> Reset scores
        </button>
        <button
          type="button"
          onClick={() =>
            patch((prev) => ({ ...prev, showScores: !prev.showScores }))
          }
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
        >
          {game.showScores ? <Eye size={16} /> : <EyeOff size={16} />}
          Scores {game.showScores ? "on" : "off"}
        </button>
      </div>

      {tab === "play" ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="min-h-0 overflow-auto p-4">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.max(game.categories.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {game.categories.map((category) => (
                <div key={category.id} className="flex min-w-0 flex-col gap-2">
                  <div className="flex min-h-14 items-center justify-center rounded-md bg-[#0b2a6b] px-2 py-2 text-center text-xs font-bold tracking-wide text-[#fff] uppercase">
                    {category.name || "Category"}
                  </div>
                  {category.clues.map((clue) => {
                    const selectedCell = game.selectedClueId === clue.id;
                    return (
                      <button
                        key={clue.id}
                        type="button"
                        onClick={() => openClue(clue.id)}
                        className={`flex min-h-12 items-center justify-center rounded-md text-lg font-bold ${
                          selectedCell
                            ? "bg-amber-400 text-neutral-950"
                            : clue.played
                              ? "bg-[#071a44] text-neutral-600"
                              : "bg-[#123a8c] text-amber-300 hover:bg-[#1a4bb5]"
                        }`}
                      >
                        {clue.played && !selectedCell ? "" : `$${clue.value}`}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-auto border-t border-neutral-800 p-4 lg:border-t-0 lg:border-l">
            {selected && game.phase !== "board" ? (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold tracking-wide text-neutral-300 uppercase">
                  {selected.category.name} · ${selected.clue.value}
                </p>
                <div>
                  <p className="text-xs text-neutral-300 uppercase">Prompt</p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {selected.clue.prompt || "(empty prompt)"}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-400 bg-amber-100 p-3">
                  <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
                    Response (operator only until revealed)
                  </p>
                  <p className="mt-1 text-lg font-bold text-amber-950">
                    {selected.clue.response || "(empty response)"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {game.phase === "clue" ? (
                    <button
                      type="button"
                      onClick={() => setPhase("answer")}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Reveal answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPhase("clue")}
                      className="rounded-md border border-teal-500 bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
                    >
                      Hide answer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={backToBoard}
                    className="rounded-md border border-teal-500 bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
                  >
                    Back to board
                  </button>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Award ${selected.clue.value}
                  </p>
                  <div className="flex flex-col gap-2">
                    {game.contestants.map((contestant) => (
                      <div
                        key={contestant.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {contestant.name}
                          </p>
                          <p className="text-sm text-neutral-400">
                            {contestant.score}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => award(contestant.id, true)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                          >
                            Correct
                          </button>
                          <button
                            type="button"
                            onClick={() => award(contestant.id, false)}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                          >
                            Incorrect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Pick a clue on the board. Contestants buzz in the room; you
                score from here.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Contestants</h2>
              <button
                type="button"
                onClick={() =>
                  patch((prev) => ({
                    ...prev,
                    contestants: [
                      ...prev.contestants,
                      createEmptyContestant(
                        `Player ${prev.contestants.length + 1}`,
                      ),
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-md border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-500"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {game.contestants.map((contestant) => (
                <div key={contestant.id} className="flex items-center gap-2">
                  <input
                    value={contestant.name}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        contestants: prev.contestants.map((c) =>
                          c.id === contestant.id
                            ? { ...c, name: e.target.value }
                            : c,
                        ),
                      }))
                    }
                    className="h-9 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-white"
                  />
                  <input
                    type="number"
                    value={contestant.score}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        contestants: prev.contestants.map((c) =>
                          c.id === contestant.id
                            ? {
                                ...c,
                                score: Number.parseInt(e.target.value || "0", 10),
                              }
                            : c,
                        ),
                      }))
                    }
                    className="h-9 w-24 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-white"
                  />
                  <button
                    type="button"
                    disabled={game.contestants.length <= 1}
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        contestants: prev.contestants.filter(
                          (c) => c.id !== contestant.id,
                        ),
                      }))
                    }
                    className="rounded-md p-2 text-neutral-400 hover:text-red-400 disabled:opacity-30"
                    aria-label="Remove contestant"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Categories</h2>
              <button
                type="button"
                onClick={() =>
                  patch((prev) => ({
                    ...prev,
                    categories: [...prev.categories, createEmptyCategory()],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-md border border-teal-500 bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-500"
              >
                <Plus size={14} /> Add category
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {game.categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      value={category.name}
                      onChange={(e) =>
                        patch((prev) => ({
                          ...prev,
                          categories: prev.categories.map((c) =>
                            c.id === category.id
                              ? { ...c, name: e.target.value }
                              : c,
                          ),
                        }))
                      }
                      className="h-9 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm font-semibold text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch((prev) => ({
                          ...prev,
                          selectedClueId:
                            prev.selectedClueId &&
                            category.clues.some((c) => c.id === prev.selectedClueId)
                              ? null
                              : prev.selectedClueId,
                          phase:
                            prev.selectedClueId &&
                            category.clues.some((c) => c.id === prev.selectedClueId)
                              ? "board"
                              : prev.phase,
                          categories: prev.categories.filter(
                            (c) => c.id !== category.id,
                          ),
                        }))
                      }
                      className="rounded-md p-2 text-neutral-400 hover:text-red-400"
                      aria-label="Remove category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {category.clues.map((clue) => (
                      <div
                        key={clue.id}
                        className="grid gap-2 md:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_36px]"
                      >
                        <input
                          type="number"
                          value={clue.value}
                          onChange={(e) =>
                            patch((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === category.id
                                  ? {
                                      ...c,
                                      clues: c.clues.map((cl) =>
                                        cl.id === clue.id
                                          ? {
                                              ...cl,
                                              value: Number.parseInt(
                                                e.target.value || "0",
                                                10,
                                              ),
                                            }
                                          : cl,
                                      ),
                                    }
                                  : c,
                              ),
                            }))
                          }
                          className="h-9 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
                        />
                        <input
                          value={clue.prompt}
                          placeholder="Prompt"
                          onChange={(e) =>
                            patch((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === category.id
                                  ? {
                                      ...c,
                                      clues: c.clues.map((cl) =>
                                        cl.id === clue.id
                                          ? { ...cl, prompt: e.target.value }
                                          : cl,
                                      ),
                                    }
                                  : c,
                              ),
                            }))
                          }
                          className="h-9 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
                        />
                        <input
                          value={clue.response}
                          placeholder="Response"
                          onChange={(e) =>
                            patch((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === category.id
                                  ? {
                                      ...c,
                                      clues: c.clues.map((cl) =>
                                        cl.id === clue.id
                                          ? { ...cl, response: e.target.value }
                                          : cl,
                                      ),
                                    }
                                  : c,
                              ),
                            }))
                          }
                          className="h-9 rounded-md border border-neutral-700 bg-neutral-950 px-2 text-sm text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            patch((prev) => ({
                              ...prev,
                              selectedClueId:
                                prev.selectedClueId === clue.id
                                  ? null
                                  : prev.selectedClueId,
                              phase:
                                prev.selectedClueId === clue.id
                                  ? "board"
                                  : prev.phase,
                              categories: prev.categories.map((c) =>
                                c.id === category.id
                                  ? {
                                      ...c,
                                      clues: c.clues.filter((cl) => cl.id !== clue.id),
                                    }
                                  : c,
                              ),
                            }))
                          }
                          className="rounded-md p-2 text-neutral-400 hover:text-red-400"
                          aria-label="Remove clue"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        patch((prev) => ({
                          ...prev,
                          categories: prev.categories.map((c) =>
                            c.id === category.id
                              ? {
                                  ...c,
                                  clues: [
                                    ...c.clues,
                                    createEmptyClue(
                                      DEFAULT_CLUE_VALUES[c.clues.length] ??
                                        (c.clues.length + 1) * 200,
                                    ),
                                  ],
                                }
                              : c,
                          ),
                        }))
                      }
                      className="self-start text-sm font-semibold text-blue-400 hover:text-blue-300"
                    >
                      + Add clue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        variant={confirm.variant}
      />
    </div>
  );
}
