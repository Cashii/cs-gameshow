"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PinGate } from "@/components/auth/PinGate";
import { ChangelogItemIcons } from "@/components/operator/changelogIcons";
import { TooltipProvider } from "@/components/ui/Tooltip";
import {
  parseChangelogMarkdown,
  type ChangelogItem,
} from "@/lib/changelog";

function ItemText({ item }: Readonly<{ item: ChangelogItem }>) {
  return (
    <div className="flex flex-col gap-0.5">
      {item.title ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="leading-5 font-semibold text-white">{item.title}</span>
          <ChangelogItemIcons item={item} />
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
          {changelog.sections.map((entry) => (
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
