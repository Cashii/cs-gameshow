import type { DerbyRacer } from "@/lib/derby/types";

export function DerbyCar({ racer }: Readonly<{ racer: DerbyRacer }>) {
  return (
    <svg
      className="derby-car-svg"
      viewBox="0 0 168 148"
      aria-hidden
      focusable="false"
    >
      <rect
        className="derby-stick"
        x="78"
        y="78"
        width="12"
        height="64"
        rx="2"
        fill="#e8c47a"
        stroke="#6b4423"
        strokeWidth="2.5"
      />
      <rect x="80" y="80" width="3" height="60" rx="1" fill="#f8e4b0" />

      <g>
        <ellipse cx="44" cy="78" rx="22" ry="22" fill="#1c1917" />
        <ellipse cx="44" cy="78" rx="13" ry="13" fill="#f5f0e6" />
        <ellipse cx="44" cy="78" rx="5" ry="5" fill="#1c1917" />

        <ellipse cx="124" cy="78" rx="22" ry="22" fill="#1c1917" />
        <ellipse cx="124" cy="78" rx="13" ry="13" fill="#f5f0e6" />
        <ellipse cx="124" cy="78" rx="5" ry="5" fill="#1c1917" />

        <path
          d="M28 70 C30 42 52 24 84 22 L108 22 C128 22 142 34 154 52 L160 62 C162 68 156 72 148 72 L30 72 C24 72 24 70 28 70 Z"
          fill={racer.hex}
          stroke="#1c1917"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M86 24 L108 24 C120 24 130 32 136 44 L88 44 C86 34 86 26 86 24 Z"
          fill="#f8f1d8"
          stroke="#1c1917"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 58 L36 58 L38 70 L22 70 Z"
          fill={racer.hexDark}
          stroke="#1c1917"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="92" cy="58" r="14" fill="#f8f1d8" stroke="#1c1917" strokeWidth="3.5" />
        <text
          x="92"
          y="64"
          textAnchor="middle"
          fill="#1c1917"
          fontSize="18"
          fontWeight="800"
          fontFamily="Oswald, Impact, sans-serif"
        >
          {racer.number}
        </text>
      </g>
    </svg>
  );
}
