"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PinGate } from "@/components/auth/PinGate";
import {
  parseChangelogMarkdown,
  type ChangelogItem,
} from "@/lib/changelog";

function ItemText({ item }: Readonly<{ item: ChangelogItem }>) {
  if (!item.title) return <>{item.detail}</>;
  return (
    <>
      <span className="font-semibold text-white">{item.title}</span>
      {item.detail ? ` — ${item.detail}` : null}
    </>
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-5">
          {changelog.sections.map((entry, index) => (
            <section key={entry.date} className="flex flex-col gap-2">
              {index === 0 ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    {changelog.title}
                  </h1>
                  <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    {entry.date}
                  </h2>
                </div>
              ) : (
                <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  {entry.date}
                </h2>
              )}
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-snug text-neutral-400 marker:font-semibold marker:text-neutral-300">
                {entry.items.map((item, itemIndex) => (
                  <li key={`${entry.date}-${item.title || itemIndex}`}>
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
      <ChangelogContent markdown={markdown} />
    </PinGate>
  );
}
