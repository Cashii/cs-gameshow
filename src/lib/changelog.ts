export type ChangelogItem = {
  title: string;
  detail: string;
};

export type ChangelogInlinePart = {
  text: string;
  bold: boolean;
};

/** Split changelog text on `**bold**` markers for UI rendering. */
export function parseChangelogInline(text: string): ChangelogInlinePart[] {
  const parts: ChangelogInlinePart[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) != null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index), bold: false });
    }
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), bold: false });
  }
  return parts.length > 0 ? parts : [{ text, bold: false }];
}

export type ChangelogSection = {
  date: string;
  items: ChangelogItem[];
};

export type ParsedChangelog = {
  title: string;
  intro: string;
  sections: ChangelogSection[];
};

const ITEM_RE = /^\d+\.\s+\*\*(.+?)\*\*\s+[—–-]\s+(.*)$/;

function parseItemLine(line: string): ChangelogItem | null {
  const match = ITEM_RE.exec(line);
  if (!match) return null;
  return { title: match[1].trim(), detail: match[2].trim() };
}

export function parseChangelogMarkdown(markdown: string): ParsedChangelog {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  let title = "Updates";
  const introParts: string[] = [];
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      title = trimmed.slice(2).trim() || title;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      current = { date: trimmed.slice(3).trim(), items: [] };
      sections.push(current);
      continue;
    }

    const item = parseItemLine(trimmed);
    if (item && current) {
      current.items.push(item);
      continue;
    }

    if (current) {
      const last = current.items.at(-1);
      if (last) last.detail = `${last.detail} ${trimmed}`.trim();
      continue;
    }

    introParts.push(trimmed);
  }

  return {
    title,
    intro: introParts.join(" "),
    sections,
  };
}
