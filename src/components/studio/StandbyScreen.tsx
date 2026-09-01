import type { ReactNode } from "react";

export function StandbyScreen({
  subtitle = "Stand by",
  children,
  size = "audience",
}: Readonly<{
  subtitle?: string;
  children?: ReactNode;
  size?: "audience" | "player";
}>) {
  const titleSize =
    size === "player"
      ? "pb-[0.4em] text-5xl leading-none"
      : "pb-[0.4em] text-5xl leading-none sm:text-7xl md:text-8xl";
  const subtitleClass =
    size === "player"
      ? "mt-2 text-lg text-neutral-400"
      : "mt-2 text-lg tracking-[0.28em] text-neutral-400 uppercase sm:text-2xl";

  return (
    <div className="studio-ui flex h-full w-full flex-col items-center justify-center px-4 text-center">
      <h1
        className={`bg-gradient-to-r from-teal-500 via-sky-500 to-amber-500 bg-clip-text text-transparent ${titleSize}`}
        style={{ fontFamily: "var(--font-pacifico), cursive" }}
      >
        CS Gameshow
      </h1>
      <p className={subtitleClass}>{subtitle}</p>
      {children}
    </div>
  );
}
