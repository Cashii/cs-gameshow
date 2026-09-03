"use client";

import { useEffect, useState } from "react";
import { SuiteProvider, useSuite } from "@/lib/suite-provider";
import { PlayerPollOverlay } from "@/components/poll/PlayerPollOverlay";
import { PlayerTriviaPanel } from "@/components/trivia/PlayerTriviaPanel";
import { PlayerDerbyPanel } from "@/components/derby/PlayerDerbyPanel";
import { PlayerTakeItPanel } from "@/components/take-it-or-leave-it/PlayerTakeItPanel";
import {
  getDeviceCode,
  getOrCreateDeviceId,
  getPlayerDisplayName,
} from "@/lib/player/device-id";
import type { TriviaChoiceId, TriviaMe } from "@/lib/trivia/types";
import type { DerbyRacerId } from "@/lib/derby/types";
import { createDefaultDerbyState, isDerbyRacerId } from "@/lib/derby/types";
import {
  createDefaultTakeItState,
} from "@/lib/take-it-or-leave-it/types";
import type { TakeItMe } from "@/lib/take-it-or-leave-it/picks";
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
  const [derbyRacerId, setDerbyRacerId] = useState<DerbyRacerId | null>(null);
  const [checkingDerby, setCheckingDerby] = useState(false);
  const [takeItMe, setTakeItMe] = useState<TakeItMe | null>(null);
  const [checkingTakeIt, setCheckingTakeIt] = useState(false);
  const poll = state.poll;
  const trivia = state.trivia;
  const derby = state.derby ?? createDefaultDerbyState();
  const takeIt = state.takeIt ?? createDefaultTakeItState();
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

  const derbyLive =
    spectatorGame === "derby" || state.activeGame === "derby";

  useEffect(() => {
    if (!derbyLive || !derby.raceId || !deviceId) {
      setDerbyRacerId(null);
      return;
    }
    let cancelled = false;
    setCheckingDerby(true);
    fetch(
      `/api/derby?raceId=${encodeURIComponent(derby.raceId)}&deviceId=${encodeURIComponent(deviceId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data: { voted?: boolean; racerId?: string }) => {
        if (cancelled) return;
        setDerbyRacerId(
          data.voted && isDerbyRacerId(data.racerId) ? data.racerId : null,
        );
      })
      .catch(() => {
        if (!cancelled) setDerbyRacerId(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingDerby(false);
      });
    return () => {
      cancelled = true;
    };
  }, [derbyLive, derby.raceId, derby.phase, deviceId]);

  const takeItLive =
    (spectatorGame === "takeIt" || state.activeGame === "takeIt") &&
    takeIt.phase !== "setup";

  useEffect(() => {
    if (!takeItLive || !takeIt.roundId || !deviceId) {
      setTakeItMe(null);
      return;
    }
    let cancelled = false;
    setCheckingTakeIt(true);
    fetch(
      `/api/take-it?deviceId=${encodeURIComponent(deviceId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data: TakeItMe) => {
        if (!cancelled) setTakeItMe(data);
      })
      .catch(() => {
        if (!cancelled) setTakeItMe(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingTakeIt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    takeItLive,
    takeIt.roundId,
    takeIt.phase,
    takeIt.lastOpenedCaseId,
    takeIt.cases,
    deviceId,
  ]);

  const handleTriviaVote = async (choiceId: TriviaChoiceId) => {
    setMessage("");
    const previousMe = me;
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

  const handleDerbyVote = async (racerId: DerbyRacerId) => {
    if (!derby.raceId) return;
    setLoading(true);
    setMessage("");
    setDerbyRacerId(racerId);
    try {
      const res = await fetch("/api/derby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          raceId: derby.raceId,
          racerId,
          deviceId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Vote failed");
      await refreshSnapshot();
    } catch (e) {
      setDerbyRacerId(null);
      setMessage(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTakeItPick = async (caseId: number) => {
    if (!takeIt.roundId) return;
    setLoading(true);
    setMessage("");
    setTakeItMe({ caseId, card: null, result: "waiting" });
    try {
      const res = await fetch("/api/take-it", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pick",
          roundId: takeIt.roundId,
          caseId,
          deviceId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Pick failed");
      await refreshSnapshot();
      const meRes = await fetch(
        `/api/take-it?deviceId=${encodeURIComponent(deviceId)}`,
        { cache: "no-store" },
      );
      const meData = (await meRes.json()) as TakeItMe;
      setTakeItMe(meData);
    } catch (e) {
      setTakeItMe(null);
      setMessage(e instanceof Error ? e.message : "Pick failed");
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

  if (derbyLive) {
    return (
      <PlayerDerbyPanel
        derby={derby}
        playerCode={playerCode}
        votedRacerId={derbyRacerId}
        checkingVote={checkingDerby}
        loading={loading}
        message={message}
        onVote={handleDerbyVote}
      />
    );
  }

  if (takeItLive) {
    return (
      <PlayerTakeItPanel
        game={takeIt}
        playerCode={playerCode}
        me={takeItMe}
        checking={checkingTakeIt}
        loading={loading}
        message={message}
        onPick={handleTakeItPick}
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
