import type { DerbyRacer, DerbyRacerId } from "@/lib/derby/types";

const HORSE_COATS: Record<
  DerbyRacerId,
  { body: string; shadow: string; mane: string }
> = {
  red: { body: "#9a3412", shadow: "#7c2d12", mane: "#1c1917" },
  blue: { body: "#a8a29e", shadow: "#78716c", mane: "#292524" },
  green: { body: "#44403c", shadow: "#292524", mane: "#0c0a09" },
  yellow: { body: "#d6a056", shadow: "#b45309", mane: "#78350f" },
};

export function DerbyHorse({ racer }: Readonly<{ racer: DerbyRacer }>) {
  const coat = HORSE_COATS[racer.id];
  return (
    <svg
      className="derby-horse-svg"
      viewBox="0 0 220 148"
      aria-hidden
      focusable="false"
    >
      <rect
        x="102"
        y="92"
        width="12"
        height="52"
        rx="2"
        fill="#e8c47a"
        stroke="#6b4423"
        strokeWidth="2.5"
      />
      <rect x="104" y="94" width="3" height="48" rx="1" fill="#f8e4b0" />

      <g className="derby-horse-figure">
        <g className="derby-leg derby-leg-back">
          <path
            d="M78 86 L70 118 L82 118 L86 86 Z"
            fill={coat.shadow}
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M68 116 L84 116 L86 124 L66 124 Z"
            fill="#1c1917"
            stroke="#1c1917"
            strokeWidth="2"
          />
        </g>
        <g className="derby-leg derby-leg-back-far">
          <path
            d="M92 86 L88 116 L98 116 L100 86 Z"
            fill={coat.body}
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M86 114 L100 114 L102 122 L84 122 Z"
            fill="#1c1917"
          />
        </g>

        <path
          d="M168 58 C176 40 168 22 178 16 C186 12 194 22 190 34 C186 48 176 58 166 64 Z"
          fill={coat.mane}
          stroke="#1c1917"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        <path
          d="M48 78 C42 86 38 74 52 62 C58 48 72 42 88 44 C108 36 132 40 150 52 C168 48 182 58 188 72 C194 84 186 94 168 96 L62 98 C46 98 42 88 48 78 Z"
          fill={coat.body}
          stroke="#1c1917"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M70 58 C86 50 118 52 142 62 C128 70 92 70 70 64 Z"
          fill={coat.shadow}
          opacity="0.35"
        />

        <path
          d="M148 56 C160 46 168 28 176 20 C182 14 194 16 198 26 C202 36 196 44 186 48 L168 62 Z"
          fill={coat.body}
          stroke="#1c1917"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d="M188 28 C198 24 210 30 214 38 C216 44 210 48 202 46 L190 40 Z"
          fill={coat.body}
          stroke="#1c1917"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <ellipse cx="208" cy="36" rx="2.2" ry="2.2" fill="#1c1917" />
        <path
          d="M176 18 L170 6 L182 16 Z"
          fill={coat.mane}
          stroke="#1c1917"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        <path
          d="M36 70 C18 78 12 96 28 104 C22 88 28 76 40 70 Z"
          fill={coat.mane}
          stroke="#1c1917"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        <g className="derby-leg derby-leg-front">
          <path
            d="M148 88 L154 122 L166 122 L158 88 Z"
            fill={coat.shadow}
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M152 120 L168 120 L170 128 L150 128 Z"
            fill="#1c1917"
          />
        </g>
        <g className="derby-leg derby-leg-front-far">
          <path
            d="M136 88 L132 118 L144 118 L148 88 Z"
            fill={coat.body}
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M130 116 L146 116 L148 124 L128 124 Z"
            fill="#1c1917"
          />
        </g>

        <path
          d="M96 52 C112 46 138 50 150 62 L146 78 L92 76 Z"
          fill={racer.hexDark}
          stroke="#1c1917"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M104 50 C120 46 136 50 144 60 L140 72 L108 70 Z"
          fill={racer.hex}
          stroke="#1c1917"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        <g className="derby-jockey">
          <path
            d="M118 28 C128 18 146 20 150 34 C152 46 140 56 128 54 C116 52 110 38 118 28 Z"
            fill="#f1d4b0"
            stroke="#1c1917"
            strokeWidth="3.5"
          />
          <path
            d="M116 24 C128 10 152 14 152 30 C140 24 126 24 116 28 Z"
            fill={racer.hex}
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M108 52 C118 44 146 46 152 58 C154 70 138 80 118 78 C104 76 100 60 108 52 Z"
            fill={racer.hex}
            stroke="#1c1917"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <text
            x="128"
            y="70"
            textAnchor="middle"
            fill="#fef3c7"
            fontSize="16"
            fontWeight="800"
            fontFamily="Oswald, Impact, sans-serif"
          >
            {racer.number}
          </text>
          <path
            d="M148 56 L176 48"
            fill="none"
            stroke="#1c1917"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M110 76 L104 92 L118 90 Z"
            fill="#f8f1d8"
            stroke="#1c1917"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M138 78 L146 94 L132 92 Z"
            fill="#f8f1d8"
            stroke="#1c1917"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
