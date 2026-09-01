import { Source_Sans_3 } from "next/font/google";
import { StudioTheme } from "@/components/studio/StudioTheme";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function OperatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${sourceSans.className} operator-ui h-full min-h-0`}>
      <StudioTheme>{children}</StudioTheme>
    </div>
  );
}
