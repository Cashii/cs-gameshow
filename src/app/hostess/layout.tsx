export default function HostessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-dvh max-h-dvh overflow-hidden overscroll-none bg-neutral-950">
      {children}
    </div>
  );
}
