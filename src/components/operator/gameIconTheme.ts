import type { ActiveGame } from "@/lib/suite-state";

export const GAME_ICON_BG: Record<Exclude<ActiveGame, "idle">, string> = {
  feud: "bg-[#2563eb] text-white",
  wheel: "bg-emerald-500 text-white",
  liveDrawer: "bg-sky-500 text-white",
  takeIt: "bg-red-500 text-white",
  derby: "bg-lime-600 text-white",
  jeoparody: "bg-violet-500 text-white",
  trivia: "bg-cyan-500 text-white",
  priceGuesser: "bg-amber-500 text-white",
  priceOrder: "bg-teal-500 text-white",
  questionTime: "bg-rose-500 text-white",
  poll: "bg-orange-500 text-white",
  messageBoard: "bg-fuchsia-500 text-white",
  pictionary: "bg-pink-500 text-white",
};

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
  questionTime: "text-rose-500",
  poll: "text-orange-500",
  messageBoard: "text-fuchsia-500",
  pictionary: "text-pink-500",
};

export const NAV_ACTIVE: Record<ActiveGame, string> = {
  idle: "bg-teal-600 text-white",
  ...GAME_ICON_BG,
};
