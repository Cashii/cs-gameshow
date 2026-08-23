export default function PlayerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-dvh max-h-dvh overflow-hidden overscroll-none">
      {children}
    </div>
  );
}
