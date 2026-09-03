import type { ReactNode } from "react";
import { GameshowLogo } from "@/components/studio/GameshowLogo";

export function StandbyScreen({
  subtitle,
  children,
  size = "audience",
  paused = false,
}: Readonly<{
  subtitle?: string;
  children?: ReactNode;
  size?: "audience" | "player";
  paused?: boolean;
}>) {
  const zoom = size === "audience" ? 1.85 : 1.35;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      <GameshowLogo
        className="absolute inset-0 h-full w-full"
        zoom={zoom}
        paused={paused}
      />
      {subtitle || children ? (
        <div
          className={`relative z-10 flex h-full w-full flex-col items-center justify-end px-4 text-center ${
            size === "audience" ? "pb-10" : "pb-8"
          }`}
        >
          {subtitle ? (
            <p className="text-base text-neutral-400">{subtitle}</p>
          ) : null}
          <div>{children}</div>
        </div>
      ) : null}
    </div>
  );
}
