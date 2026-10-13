import type { ReactNode } from "react";

const TONE = {
  warning: "border-amber-600 bg-amber-200 text-stone-900",
  info: "border-sky-600 bg-sky-200 text-sky-950",
} as const;

export function SpectatorScreenNotice({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="shrink-0 bg-amber-400/15 px-6 py-2.5 text-sm font-medium text-amber-100">
      {children}
    </div>
  );
}

export function OperatorNotice({
  children,
  tone = "warning",
  title,
  className = "",
}: Readonly<{
  children: ReactNode;
  tone?: keyof typeof TONE;
  title?: string;
  className?: string;
}>) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${TONE[tone]} ${className}`.trim()}
    >
      {title ? (
        <>
          <p className="text-base font-bold">{title}</p>
          <p className="mt-1">{children}</p>
        </>
      ) : (
        children
      )}
    </div>
  );
}
