import {
  BarChart3,
  Brain,
  Briefcase,
  CircleDollarSign,
  Flag,
  Heart,
  ImageIcon,
  LayoutGrid,
  Coins,
  ListOrdered,
  Pencil,
  ScrollText,
  Sparkles,
  Tag,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { GAME_ICON_TEXT } from "@/components/operator/gameIconTheme";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ChangelogItem } from "@/lib/changelog";
import type { ActiveGame } from "@/lib/suite-state";

export function gamesForChangelogItem(
  item: ChangelogItem,
): Array<Exclude<ActiveGame, "idle">> {
  const text = `${item.title} ${item.detail}`.toLowerCase();

  if (text.includes("saved lists")) {
    return [
      "feud",
      "wheel",
      "trivia",
      "priceGuesser",
      "priceOrder",
      "questionTime",
      "pictionary",
      "jeoparody",
      "poll",
    ];
  }
  if (text.includes("saved setups")) {
    return [
      "feud",
      "derby",
      "trivia",
      "priceGuesser",
      "priceOrder",
      "priceWheel",
      "questionTime",
      "pictionary",
      "takeIt",
      "jeoparody",
      "poll",
      "liveDrawer",
    ];
  }
  if (text.includes("no longer ask you to name a setup")) {
    return ["derby", "takeIt", "liveDrawer", "priceWheel"];
  }
  if (text.includes("spectator screen is showing another game")) {
    return ["feud", "priceWheel", "liveDrawer", "poll", "messageBoard"];
  }
  if (text.includes("price wheel")) return ["priceWheel"];
  if (text.includes("message board")) return ["messageBoard"];
  if (
    (text.includes("price guesser") || text.includes("price is tight")) &&
    text.includes("price order") &&
    !text.includes("uploaded photos") &&
    !text.includes("question lists")
  ) {
    return ["priceGuesser", "priceOrder"];
  }
  if (text.includes("price order") && !text.includes("uploaded photos")) {
    return ["priceOrder"];
  }
  if (
    text.includes("question time") ||
    text.includes("newly weds") ||
    text.includes("newlyweds")
  ) {
    return ["questionTime"];
  }
  if (text.includes("take it")) return ["takeIt"];

  if (text.includes("elimination trivia") || text.includes(" trivia")) {
    return ["trivia"];
  }
  if (text.includes("poll")) return ["poll"];
  if (text.includes("derby")) return ["derby"];
  if (text.includes("pictionary") || text.includes("dicktionary"))
    return ["pictionary"];
  if (text.includes("jeoparody")) return ["jeoparody"];
  if (
    (text.includes("price guesser") || text.includes("price is tight")) &&
    !text.includes("uploaded photos")
  ) {
    return ["priceGuesser"];
  }
  if (text.includes("live drawer")) return ["liveDrawer"];

  if (text.includes("uploaded photos")) return ["priceGuesser", "priceOrder"];

  if (text.includes("strikes")) {
    return ["feud", "wheel"];
  }
  if (text.includes("friendly feud")) return ["feud"];
  if (
    text.includes("word up") ||
    text.includes("wheel of riches") ||
    text.includes("wheel")
  ) {
    return ["wheel"];
  }

  if (
    text.includes("branding") ||
    text.includes("updates") ||
    text.includes("spectator")
  ) {
    return [];
  }

  return [];
}

export function iconForChangelogGame(
  game: Exclude<ActiveGame, "idle">,
): LucideIcon {
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
    case "priceWheel":
      return Coins;
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

export function labelForChangelogGame(
  game: Exclude<ActiveGame, "idle">,
): string {
  switch (game) {
    case "feud":
      return "Friendly Feud";
    case "wheel":
      return "Word Up";
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
      return "Price is Tight";
    case "priceOrder":
      return "Price Order";
    case "priceWheel":
      return "Price Wheel";
    case "questionTime":
      return "Newly Weds";
    case "poll":
      return "O69 Club Poll";
    case "messageBoard":
      return "Message Board";
    case "pictionary":
      return "Dicktionary";
    default:
      return "Game";
  }
}

export function fallbackIconForChangelogItem(item: ChangelogItem): LucideIcon {
  const text = `${item.title} ${item.detail}`.toLowerCase();
  if (text.includes("uploaded photo")) return ImageIcon;
  if (text.includes("branding") || text.includes("spectator")) return Sparkles;
  if (
    text.includes("strikes") ||
    text.includes("feud") ||
    text.includes("wheel")
  ) {
    return Users;
  }
  return ScrollText;
}

export function ChangelogItemIcons({
  item,
}: Readonly<{ item: ChangelogItem }>) {
  const games = gamesForChangelogItem(item);

  return (
    <span className="inline-flex items-center gap-1">
      {games.length > 0 ? (
        games.map((g) => {
          const Icon = iconForChangelogGame(g);
          return (
            <Tooltip key={g} content={labelForChangelogGame(g)} delayDuration={0}>
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
      ) : (
        (() => {
          const Icon = fallbackIconForChangelogItem(item);
          return (
            <Icon
              size={14}
              strokeWidth={2.2}
              className="shrink-0 text-white"
              aria-hidden
            />
          );
        })()
      )}
    </span>
  );
}
