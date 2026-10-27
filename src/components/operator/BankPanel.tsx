"use client";

import type { ReactNode } from "react";

export const bankSaveClass =
  "h-9 rounded-md border border-teal-500 bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40";

export const bankHeaderSaveClass =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-teal-500 bg-teal-600 px-2.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40";

export const bankHeaderNeutralClass =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-neutral-700";

export const bankLoadClass =
  "h-7 shrink-0 rounded-md border border-teal-500 bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40";

export const bankDeleteClass =
  "inline-flex h-11 shrink-0 items-center rounded-md border border-neutral-600 bg-neutral-800 px-3 text-sm font-semibold text-neutral-200 hover:text-red-300 disabled:opacity-40";

export const bankIconButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white";

export const bankIconDeleteClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-red-300 disabled:cursor-not-allowed disabled:text-neutral-600 disabled:hover:bg-transparent";

export function BankPanel({
  title,
  hint,
  actions,
  empty,
  bare = false,
  children,
}: {
  title: string;
  hint: string;
  actions?: ReactNode;
  empty: string;
  /** Render children directly instead of wrapping them in a list. */
  bare?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="shrink-0 border-b border-neutral-800 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          {title}
        </h2>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <p className="mt-2 text-xs text-neutral-500">{hint}</p>
      {bare ? (
        <div className="mt-3">{children}</div>
      ) : children ? (
        <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {children}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">{empty}</p>
      )}
    </section>
  );
}

export function BankRow({
  children,
  actions,
}: {
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 px-2 py-1.5">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">{actions}</div>
    </li>
  );
}
