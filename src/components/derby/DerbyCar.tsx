import type { DerbyRacer } from "@/lib/derby/types";

export function DerbyCar({ racer }: Readonly<{ racer: DerbyRacer }>) {
  const id = racer.id;
  return (
    <svg
      className="derby-car-svg"
      viewBox="0 0 200 78"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="38%" stopColor={racer.hex} />
          <stop offset="100%" stopColor={racer.hexDark} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <g className="derby-car-streaks">
        <rect x="2" y="28" width="36" height="3" rx="1.5" />
        <rect x="8" y="36" width="28" height="2.5" rx="1.2" />
        <rect x="4" y="43" width="32" height="2.5" rx="1.2" />
      </g>
      <ellipse className="derby-car-shadow" cx="108" cy="70" rx="62" ry="6" />
      <g className="derby-wheel-spin derby-wheel-spin--rear">
        <circle cx="52" cy="58" r="13" fill="#09090b" />
        <circle cx="52" cy="58" r="8" fill="#3f3f46" />
        <path d="M52 50 L52 66 M44 58 L60 58" stroke="#d4d4d8" strokeWidth="2" />
      </g>
      <g className="derby-wheel-spin derby-wheel-spin--front">
        <circle cx="150" cy="58" r="13" fill="#09090b" />
        <circle cx="150" cy="58" r="8" fill="#3f3f46" />
        <path
          d="M150 50 L150 66 M142 58 L158 58"
          stroke="#d4d4d8"
          strokeWidth="2"
        />
      </g>
      <path
        d="M38 52 C42 36 58 24 86 22 L118 22 C136 22 148 28 166 40 L184 46 C190 47 192 52 186 55 L40 55 Z"
        fill={`url(#${id}-body)`}
      />
      <path
        d="M90 22 L116 22 C124 22 132 26 138 34 L96 34 C92 28 90 24 90 22 Z"
        fill={`url(#${id}-glass)`}
      />
      <path d="M34 44 L44 44 L46 52 L32 52 Z" fill={racer.hexDark} />
      <path d="M170 34 L186 34 L186 46 L168 42 Z" fill={racer.hexDark} />
      <rect x="176" y="38" width="8" height="5" rx="1" fill="#fde68a" />
      <rect x="36" y="46" width="6" height="5" rx="1" fill="#f97316" />
      <text
        x="108"
        y="50"
        textAnchor="middle"
        fill="#fff"
        fontSize="18"
        fontWeight="700"
        fontFamily="Oswald, Impact, sans-serif"
      >
        {racer.number}
      </text>
    </svg>
  );
}
