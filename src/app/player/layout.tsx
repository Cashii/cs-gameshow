import { StudioTheme } from "@/components/studio/StudioTheme";

export default function PlayerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="studio-ui h-dvh max-h-dvh overflow-hidden overscroll-none">
      <StudioTheme />
      {children}
    </div>
  );
}
