"use client";

import {
  getDerbyRacers,
  getDerbyRacerNameOverrides,
  getDerbyTheme,
  type DerbyGameState,
  type DerbyRacerId,
} from "@/lib/derby/types";

export function PlayerDerbyPanel({
  derby,
  playerCode,
  votedRacerId,
  checkingVote,
  loading,
  message,
  onVote,
}: Readonly<{
  derby: DerbyGameState;
  playerCode: string;
  votedRacerId: DerbyRacerId | null;
  checkingVote: boolean;
  loading: boolean;
  message: string;
  onVote: (racerId: DerbyRacerId) => void;
}>) {
  const theme = getDerbyTheme(derby);
  const racers = getDerbyRacers(theme, getDerbyRacerNameOverrides(derby, theme));
  const racerNoun = theme === "wonderbar" ? "toy" : "horse";
  const votingOpen = derby.phase === "idle" && Boolean(derby.raceId);
  const voted = votedRacerId != null;
  const picked = votedRacerId
    ? racers.find((racer) => racer.id === votedRacerId)
    : null;

  return (
    <div className="flex h-full flex-col bg-neutral-950 px-4 py-6 text-white">
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Derby Race
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {votingOpen
            ? `Pick a ${racerNoun}`
            : derby.phase === "racing"
              ? "Race in progress"
              : derby.phase === "finished"
                ? "Race finished"
                : "Stand by"}
        </h1>
        {playerCode ? (
          <p className="mt-2 text-sm tracking-widest text-neutral-500">
            {playerCode}
          </p>
        ) : null}
      </div>

      {checkingVote ? (
        <p className="text-center text-sm text-neutral-400">Checking your pick…</p>
      ) : null}

      {voted && picked ? (
        <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-6 text-center">
          <p className="text-sm text-emerald-200">You picked</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: picked.hex }}>
            {picked.name}
          </p>
          {!votingOpen ? (
            <p className="mt-3 text-sm text-neutral-400">
              Voting is locked for this race.
            </p>
          ) : null}
        </div>
      ) : null}

      {votingOpen && !voted ? (
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
          {racers.map((racer) => (
            <button
              key={racer.id}
              type="button"
              disabled={loading}
              onClick={() => onVote(racer.id)}
              className="rounded-2xl border border-neutral-700 bg-neutral-900 px-3 py-6 text-center hover:border-white/40 disabled:opacity-50"
            >
              <span
                className="mx-auto mb-3 block h-10 w-10 rounded-full border border-black/30"
                style={{ background: racer.hex }}
                aria-hidden
              />
              <span className="block text-lg font-bold">{racer.name}</span>
              <span className="text-xs text-neutral-500 capitalize">
                {racerNoun} {racer.number}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!votingOpen && !voted ? (
        <p className="mt-8 text-center text-sm text-neutral-400">
          {derby.phase === "racing"
            ? "The race is running — wait for the next one."
            : "Voting opens when the race is ready on the big screen."}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 text-center text-sm text-amber-300">{message}</p>
      ) : null}
    </div>
  );
}
