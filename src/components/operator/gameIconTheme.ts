import type { ActiveGame } from "@/lib/suite-state";

export const GAME_ICON_TEXT: Record<Exclude<ActiveGame, "idle">, string> = {
  feud: "text-[#2563eb]",
  wheel: "text-emerald-500",
  liveDrawer: "text-sky-500",
  takeIt: "text-red-500",
  derby: "text-lime-600",
  jeoparody: "text-violet-500",
  trivia: "text-cyan-500",
  priceGuesser: "text-amber-500",
  priceOrder: "text-teal-500",
  priceWheel: "text-yellow-500",
  questionTime: "text-rose-500",
  poll: "text-orange-500",
  messageBoard: "text-fuchsia-500",
  pictionary: "text-pink-500",
};

/** Shared selected-row background for the operator nav and spectator rail. */
export const NAV_ITEM_ACTIVE = "bg-blue-600/30 text-neutral-100 shadow-sm";
