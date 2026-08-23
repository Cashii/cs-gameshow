"use client";

import { useEffect, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import { PlayerPollOverlay } from "@/components/poll/PlayerPollOverlay";
import {
  getDeviceCode,
  getOrCreateDeviceId,
  getPlayerDisplayName,
} from "@/lib/player/device-id";

function PlayerContent() {
  const { state, refreshSnapshot } = useSuite();
  const [votedPollId, setVotedPollId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingVote, setCheckingVote] = useState(false);
  const poll = state.poll;
  const deviceId = getOrCreateDeviceId();
  const playerCode = getDeviceCode(deviceId);
  const voted = votedPollId === poll.id;

  useEffect(() => {
    if (poll.status !== "open" || !poll.id || !deviceId) {
      setVotedPollId(null);
      return;
    }

    let cancelled = false;
    setCheckingVote(true);
    fetch(
      `/api/poll/status?pollId=${encodeURIComponent(poll.id)}&deviceId=${encodeURIComponent(deviceId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data: { voted?: boolean }) => {
        if (cancelled) return;
        setVotedPollId(data.voted ? poll.id : null);
      })
      .catch(() => {
        if (!cancelled) setVotedPollId(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingVote(false);
      });

    return () => {
      cancelled = true;
    };
  }, [poll.id, poll.status, deviceId]);

  const handleVote = async (choiceId: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          pollId: poll.id,
          choiceId,
          deviceId,
          displayName: getPlayerDisplayName(deviceId),
          userAgent: navigator.userAgent,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Vote failed");
      setVotedPollId(poll.id);
      await refreshSnapshot();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setLoading(false);
    }
  };

  if (poll.status === "open" || poll.status === "results") {
    return (
      <PlayerPollOverlay
        poll={poll}
        voted={voted}
        checkingVote={checkingVote}
        loading={loading}
        message={message}
        playerCode={playerCode}
        onVote={handleVote}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-950 px-4 text-center">
      <h1 className="text-3xl font-bold text-white">CS Gameshow</h1>
      <p className="mt-4 text-neutral-400">
        Stand by — no poll is open right now.
      </p>
      {playerCode ? (
        <p className="mt-10 text-sm tracking-widest text-neutral-500">
          {playerCode}
        </p>
      ) : null}
    </div>
  );
}

export function PlayerShell() {
  return (
    <SuiteProvider role="player">
      <PlayerContent />
    </SuiteProvider>
  );
}
