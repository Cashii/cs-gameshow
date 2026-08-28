export function DerbyWonderbarBrand() {
  return (
    <div className="derby-wonderbar-brand">
      <div className="derby-wonderbar-lockup" aria-label="Wonder BAR">
        <p className="derby-wonderbar-script">
          <span className="derby-wonderbar-letters">W</span>
          <span className="derby-wonderbar-o" aria-hidden>
            <DerbyDiscoBall compact />
          </span>
          <span className="derby-wonderbar-letters">nder</span>
        </p>
        <p className="derby-wonderbar-bar">BAR</p>
      </div>
      <h1 className="derby-title">Dildo Derby</h1>
    </div>
  );
}

export function DerbyDiscoBall({
  compact = false,
}: Readonly<{ compact?: boolean }>) {
  return (
    <svg
      className={
        compact ? "derby-disco-ball-svg is-compact" : "derby-disco-ball-svg"
      }
      viewBox={compact ? "8 18 64 68" : "0 0 80 96"}
      aria-hidden
    >
      {!compact && (
        <>
          <line
            x1="40"
            y1="0"
            x2="40"
            y2="12"
            stroke="#f5d0fe"
            strokeWidth="3"
          />
          <circle cx="40" cy="12" r="3.5" fill="#f5d0fe" />
        </>
      )}
      <circle
        cx="40"
        cy="52"
        r="34"
        fill="#a21caf"
        stroke="#f5d0fe"
        strokeWidth="3"
      />
      <g className="derby-disco-facets">
        {Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 7 }, (_, col) => {
            const x = 16 + col * 8;
            const y = 28 + row * 8;
            const on = (row + col) % 2 === 0;
            return (
              <rect
                key={`${row}-${col}`}
                x={x}
                y={y}
                width="7"
                height="7"
                rx="1"
                fill={on ? "#f5d0fe" : "#6b21a8"}
                opacity={on ? 0.95 : 0.8}
              />
            );
          }),
        )}
      </g>
      <ellipse cx="30" cy="38" rx="10" ry="6" fill="#fff" opacity="0.28" />
    </svg>
  );
}
