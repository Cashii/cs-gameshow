"use client";

import { useEffect, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import { PlayerPollOverlay } from "@/components/poll/PlayerPollOverlay";
import { PlayerTriviaPanel } from "@/components/trivia/PlayerTriviaPanel";
import {
  getDeviceCode,
  getOrCreateDeviceId,
  getPlayerDisplayName,
} from "@/lib/player/device-id";
import type { TriviaChoiceId, TriviaMe } from "@/lib/trivia/types";
import { StandbyScreen } from "@/components/studio/StandbyScreen";

function triviaActive(status: string) {
  return status !== "idle";
}

function PlayerContent() {
  const { state, refreshSnapshot } = useSuite();
  const [votedPollId, setVotedPollId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingVote, setCheckingVote] = useState(false);
  const [me, setMe] = useState<TriviaMe | null>(null);
  const poll = state.poll;
  const trivia = state.trivia;
  const spectatorGame = state.spectatorGame ?? state.activeGame;
  const deviceId = getOrCreateDeviceId();
  const playerCode = getDeviceCode(deviceId);
  const voted = votedPollId === poll.id;

  useEffect(() => {
    if (spectatorGame !== "trivia" || !triviaActive(trivia.status) || !deviceId) {
      setMe(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/trivia/me?deviceId=${encodeURIComponent(deviceId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data: TriviaMe) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    trivia.status,
    trivia.roundId,
    trivia.survivingChoiceId,
    trivia.remainingCount,
    trivia.winnerCodes,
    deviceId,
    spectatorGame,
  ]);

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

  const handleTriviaVote = async (choiceId: TriviaChoiceId) => {
    setMessage("");
    const previousMe = me;
    // Optimistic lock so the player sees instant feedback.
    setMe((prev) =>
      prev
        ? { ...prev, voted: true, canVote: false, choiceId }
        : {
            role: "active",
            canVote: false,
            voted: true,
            choiceId,
            remainingCount: trivia.remainingCount,
            winner: false,
          },
    );
    setLoading(true);
    try {
      const res = await fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          roundId: trivia.roundId,
          choiceId,
          deviceId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Vote failed");
      await refreshSnapshot();
    } catch (e) {
      setMe(previousMe);
      setMessage(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setLoading(false);
    }
  };

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

  if (spectatorGame === "trivia" && triviaActive(trivia.status)) {
    return (
      <PlayerTriviaPanel
        trivia={trivia}
        deviceId={deviceId}
        playerCode={playerCode}
        me={me}
        loading={loading}
        message={message}
        onVote={handleTriviaVote}
      />
    );
  }

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
    <StandbyScreen
      size="player"
      subtitle="Stand by — no poll is open right now."
    >
      {playerCode ? (
        <div className="mt-3 text-sm tracking-widest text-neutral-500">
          {playerCode}
        </div>
      ) : null}
    </StandbyScreen>
  );
}

export function PlayerShell() {
  return (
    <SuiteProvider role="player">
      <div className="h-full w-full">
        <PlayerContent />
      </div>
    </SuiteProvider>
  );
}
