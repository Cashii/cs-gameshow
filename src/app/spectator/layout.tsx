import type { ReactNode } from "react";
import { GAMESHOW_LOGO_ART } from "@/lib/gameshow-logo";

export default function SpectatorLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <link
        rel="preload"
        href={GAMESHOW_LOGO_ART.default.src}
        as="image"
        type="image/svg+xml"
      />
      <link
        rel="preload"
        href={GAMESHOW_LOGO_ART.noshadow.src}
        as="image"
        type="image/svg+xml"
      />
      {children}
    </>
  );
}
