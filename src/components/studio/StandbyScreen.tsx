import type { ReactNode } from "react";
import { GameshowLogo } from "@/components/studio/GameshowLogo";

export function StandbyScreen({
  subtitle,
  children,
  size = "audience",
}: Readonly<{
  subtitle?: string;
  children?: ReactNode;
  size?: "audience" | "player";
}>) {
  if (size === "audience") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
        <GameshowLogo className="absolute inset-0 h-full w-full origin-center scale-[1.85] object-contain" />
        {children ? (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-4 pb-10">
            {children}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      <GameshowLogo className="absolute inset-0 h-full w-full origin-center scale-[1.35] object-contain" />
      {subtitle || children ? (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-4 pb-8 text-center">
          {subtitle ? (
            <p className="text-base text-neutral-400">{subtitle}</p>
          ) : null}
          <div>{children}</div>
        </div>
      ) : null}
    </div>
  );
}
