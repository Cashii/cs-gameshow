"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  Briefcase,
  CircleDollarSign,
  Flag,
  Heart,
  ImageIcon,
  ListOrdered,
  Pencil,
  ScrollText,
  Sparkles,
  Tag,
  Ticket,
  LayoutGrid,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PinGate } from "@/components/auth/PinGate";
import { GAME_ICON_TEXT } from "@/components/operator/gameIconTheme";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import {
  parseChangelogMarkdown,
  type ChangelogItem,
} from "@/lib/changelog";
import type { ActiveGame } from "@/lib/suite-state";

function gameForItem(item: ChangelogItem): Exclude<ActiveGame, "idle"> | null {
  const text = `${item.title} ${item.detail}`.toLowerCase();
  if (text.includes("price order")) return "priceOrder";
  if (text.includes("question time")) return "questionTime";
  if (text.includes("take it")) return "takeIt";
  if (text.includes("trivia")) return "trivia";
  if (text.includes("poll")) return "poll";
  if (text.includes("derby")) return "derby";
  if (text.includes("pictionary")) return "pictionary";
  if (text.includes("price guesser")) return "priceGuesser";
  if (text.includes("live drawer")) return "liveDrawer";
  return null;
}

function iconForItem(item: ChangelogItem): LucideIcon {
  const game = gameForItem(item);
  if (game === "priceOrder") return ListOrdered;
  if (game === "questionTime") return Heart;
  if (game === "takeIt") return Briefcase;
  if (game === "trivia") return Brain;
  if (game === "poll") return BarChart3;
  if (game === "derby") return Flag;
  if (game === "pictionary") return Pencil;
  if (game === "priceGuesser") return Tag;
  if (game === "liveDrawer") return Ticket;

  const text = `${item.title} ${item.detail}`.toLowerCase();
  if (text.includes("uploaded photo")) return ImageIcon;
  if (text.includes("branding")) return Sparkles;
  if (text.includes("strikes") || text.includes("feud") || text.includes("wheel")) return Users;
  return ScrollText;
}

function gamesForChangelogItem(
  item: ChangelogItem,
): Array<Exclude<ActiveGame, "idle">> {
  const text = `${item.title} ${item.detail}`.toLowerCase();

  if (
    text.includes("price order") &&
    !text.includes("uploaded photos")
  )
    return ["priceOrder"];
  if (text.includes("question time")) return ["questionTime"];
  if (text.includes("take it")) return ["takeIt"];

  if (text.includes("elimination trivia") || text.includes(" trivia")) {
    return ["trivia"];
  }
  if (text.includes("poll")) return ["poll"];
  if (text.includes("derby")) return ["derby"];
  if (text.includes("pictionary")) return ["pictionary"];
  if (
    text.includes("price guesser") &&
    !text.includes("uploaded photos")
  )
    return ["priceGuesser"];
  if (text.includes("live drawer")) return ["liveDrawer"];

  if (text.includes("uploaded photos")) return ["priceGuesser", "priceOrder"];

  if (
    text.includes("strikes") ||
    text.includes("friendly feud") ||
    text.includes("wheel of riches") ||
    text.includes("wheel")
  ) {
    return ["feud", "wheel"];
  }

  // Non-game-specific changes.
  if (text.includes("branding") || text.includes("updates")) return [];

  return [];
}

function iconForChangelogGame(game: Exclude<ActiveGame, "idle">): LucideIcon {
  switch (game) {
    case "feud":
      return Users;
    case "wheel":
      return CircleDollarSign;
    case "liveDrawer":
      return Ticket;
    case "takeIt":
      return Briefcase;
    case "derby":
      return Flag;
    case "jeoparody":
      return LayoutGrid;
    case "trivia":
      return Brain;
    case "priceGuesser":
      return Tag;
    case "priceOrder":
      return ListOrdered;
    case "questionTime":
      return Heart;
    case "poll":
      return BarChart3;
    case "messageBoard":
      return LayoutGrid;
    case "pictionary":
      return Pencil;
    default:
      return LayoutGrid;
  }
}

function labelForChangelogGame(game: Exclude<ActiveGame, "idle">): string {
  switch (game) {
    case "feud":
      return "Friendly Feud";
    case "wheel":
      return "Wheel of Riches";
    case "liveDrawer":
      return "Live Drawer";
    case "takeIt":
      return "Take It or Leave It";
    case "derby":
      return "Derby Race";
    case "jeoparody":
      return "Jeoparody";
    case "trivia":
      return "Elimination Trivia";
    case "priceGuesser":
      return "Price Guesser";
    case "priceOrder":
      return "Price Order";
    case "questionTime":
      return "Question Time";
    case "poll":
      return "Poll";
    case "messageBoard":
      return "Message Board";
    case "pictionary":
      return "Pictionary";
    default:
      return "Game";
  }
}

function ItemText({ item }: Readonly<{ item: ChangelogItem }>) {
  const games = gamesForChangelogItem(item);

  return (
    <div className="flex flex-col gap-0.5">
      {item.title ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="leading-5 font-semibold text-white">{item.title}</span>
          <span className="inline-flex items-center gap-1">
            {games.length > 0
              ? games.map((g) => {
                  const Icon = iconForChangelogGame(g);
                  return (
                    <Tooltip
                      key={g}
                      content={labelForChangelogGame(g)}
                      delayDuration={0}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Icon
                          size={14}
                          strokeWidth={2.2}
                          className={`${GAME_ICON_TEXT[g]} shrink-0`}
                          aria-hidden
                        />
                      </span>
                    </Tooltip>
                  );
                })
              : (
                  <LayoutGrid
                    size={14}
                    strokeWidth={2.2}
                    className="text-white shrink-0"
                    aria-hidden
                  />
                )}
          </span>
        </div>
      ) : null}

      {item.detail ? (
        <span className="leading-5 text-neutral-400">{item.detail}</span>
      ) : null}
    </div>
  );
}

function ChangelogContent({ markdown }: Readonly<{ markdown: string }>) {
  const changelog = parseChangelogMarkdown(markdown);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-neutral-950">
      <header className="flex h-12 shrink-0 items-center border-b border-neutral-800 bg-neutral-900 px-6">
        <Link
          href="/operator"
          className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {changelog.title}
          </h1>
          {changelog.sections.map((entry, index) => (
            <section
              key={entry.date}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
            >
              <div className="border-b border-neutral-800 pb-3">
                <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  {entry.date}
                </h2>
              </div>
              <ol className="mt-4 list-decimal space-y-3.5 pl-5 text-sm leading-snug text-neutral-400 marker:font-semibold marker:text-neutral-500">
                {entry.items.map((item, itemIndex) => (
                  <li
                    key={`${entry.date}-${item.title || itemIndex}`}
                    className="pl-1"
                  >
                    <ItemText item={item} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export function ChangelogPage({ markdown }: Readonly<{ markdown: string }>) {
  return (
    <PinGate role="operator" title="Operator">
      <TooltipProvider>
        <ChangelogContent markdown={markdown} />
      </TooltipProvider>
    </PinGate>
  );
}
