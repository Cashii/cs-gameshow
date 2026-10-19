import type { ReactNode } from "react";
import { GameshowLogo } from "@/components/studio/GameshowLogo";

export function StandbyScreen({
  title,
  subtitle,
  children,
  size = "audience",
  paused = false,
}: Readonly<{
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  size?: "audience" | "player";
  paused?: boolean;
}>) {
  const isPlayer = size === "player";
  const hasFooter = Boolean(title || subtitle || children);

  if (isPlayer) {
    const hasMessage = Boolean(title || subtitle);
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-6">
        <div className="flex w-full max-w-lg flex-col items-center sm:max-w-xl">
          <div className="relative aspect-[699/463] w-full shrink-0">
            <GameshowLogo
              className="absolute inset-0 h-full w-full"
              zoom={1}
              paused={paused}
            />
          </div>
          {hasMessage ? (
            <div className="relative z-10 -mt-10 w-full text-center sm:-mt-12">
              {title ? (
                <p className="text-3xl font-bold tracking-wide text-white">
                  {title}
                </p>
              ) : null}
              {subtitle ? (
                <p
                  className={`text-base leading-relaxed text-neutral-300 ${
                    title ? "mt-1" : ""
                  }`}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      <GameshowLogo
        className="absolute inset-0 h-full w-full"
        zoom={1.85}
        paused={paused}
      />
      {hasFooter ? (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-4 pb-10 text-center">
          {title ? (
            <p
              className="text-2xl font-bold tracking-wide text-white sm:text-3xl"
              style={{ textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}
            >
              {title}
            </p>
          ) : null}
          {subtitle ? (
            <p
              className={`text-base text-neutral-200 ${title ? "mt-2" : ""}`}
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.75)" }}
            >
              {subtitle}
            </p>
          ) : null}
          <div>{children}</div>
        </div>
      ) : null}
    </div>
  );
}
