"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";

export function PlayerVoteQr() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(80);

  useEffect(() => {
    setUrl(`${window.location.origin}/player`);
  }, []);

  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const fit = () => {
      const labelSpace = 56;
      const pad = 20;
      const next = Math.min(el.clientWidth - pad, el.clientHeight - labelSpace);
      setSize(Math.max(48, Math.floor(next)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [url]);

  return (
    <div
      ref={slotRef}
      className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center"
    >
      {url && size > 0 && (
        <>
          <div className="rounded-2xl bg-white p-3" style={{ width: size + 24 }}>
            <QRCode
              value={url}
              size={size}
              title="Open player screen to vote"
              level="M"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>
          <p
            className="mt-2 shrink-0 text-center font-bold tracking-[0.12em] text-neutral-200 uppercase"
            style={{
              fontSize: `clamp(0.95rem, ${Math.max(14, size * 0.14)}px, 2.25rem)`,
            }}
          >
            Scan to vote
          </p>
        </>
      )}
    </div>
  );
}
