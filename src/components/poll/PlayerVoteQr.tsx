"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

export function PlayerVoteQr() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/player`);
  }, []);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-4">
        <QRCode
          value={url}
          size={240}
          title="Open player screen to vote"
          level="M"
        />
      </div>
      <p className="text-2xl font-bold tracking-[0.12em] text-neutral-200 uppercase sm:text-3xl">
        Scan to vote
      </p>
    </div>
  );
}
