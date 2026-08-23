"use client";

export function PollWaitingScreen() {
  return (
    <div
      className="poll-waiting"
      role="status"
      aria-live="polite"
      aria-label="Stand by"
    >
      <div className="poll-waiting-glow" aria-hidden />
      <div className="poll-waiting-ring" aria-hidden />
      <div className="poll-waiting-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
