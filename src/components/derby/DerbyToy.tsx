import type { ReactNode } from "react";
import type { DerbyRacer, DerbyRacerId } from "@/lib/derby/types";

function ToyPaint({ id, racer }: Readonly<{ id: string; racer: DerbyRacer }>) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff7fb" stopOpacity="0.5" />
        <stop offset="32%" stopColor={racer.hex} />
        <stop offset="100%" stopColor={racer.hexDark} />
      </linearGradient>
      <linearGradient id={`${id}-head`} x1="0.2" y1="0" x2="0.75" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.48" />
        <stop offset="40%" stopColor={racer.hex} />
        <stop offset="100%" stopColor={racer.hexDark} />
      </linearGradient>
      <radialGradient id={`${id}-base`} cx="36%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.38" />
        <stop offset="48%" stopColor={racer.hex} />
        <stop offset="100%" stopColor={racer.hexDark} />
      </radialGradient>
      <radialGradient id={`${id}-spray`} cx="30%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="52%" stopColor="#f6f0e2" />
        <stop offset="100%" stopColor="#e4d3b4" />
      </radialGradient>
    </defs>
  );
}

function BuzzMarks({ racer }: Readonly<{ racer: DerbyRacer }>) {
  return (
    <g className="derby-toy-buzz-marks">
      <g className="derby-toy-buzz-left">
        <path
          className="derby-toy-buzz-line"
          d="M24 20 l-18 -16"
          fill="none"
          stroke={racer.hex}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          className="derby-toy-buzz-line"
          d="M12 50 l-18 -5"
          fill="none"
          stroke="#fdf4ff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          className="derby-toy-buzz-line"
          d="M10 86 l-16 6"
          fill="none"
          stroke={racer.hex}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          className="derby-toy-buzz-line"
          d="M26 124 l-16 16"
          fill="none"
          stroke="#fdf4ff"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g className="derby-toy-buzz-right">
        <path
          className="derby-toy-buzz-line"
          d="M250 18 l18 -16"
          fill="none"
          stroke="#fdf4ff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          className="derby-toy-buzz-line"
          d="M266 48 l20 -4"
          fill="none"
          stroke={racer.hex}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          className="derby-toy-buzz-line"
          d="M272 82 l16 8"
          fill="none"
          stroke="#fdf4ff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          className="derby-toy-buzz-line"
          d="M252 120 l16 16"
          fill="none"
          stroke={racer.hex}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function Scrotum({
  id,
  rear,
  front,
}: Readonly<{
  id: string;
  rear: { cx: number; cy: number; rx: number; ry: number };
  front: { cx: number; cy: number; rx: number; ry: number };
}>) {
  return (
    <g>
      <ellipse
        cx={rear.cx}
        cy={rear.cy}
        rx={rear.rx}
        ry={rear.ry}
        fill={`url(#${id}-base)`}
        stroke="#1c1917"
        strokeWidth="5"
      />
      <ellipse
        cx={front.cx}
        cy={front.cy}
        rx={front.rx}
        ry={front.ry}
        fill={`url(#${id}-body)`}
        stroke="#1c1917"
        strokeWidth="5"
      />
      <ellipse
        cx={rear.cx - rear.rx * 0.28}
        cy={rear.cy - rear.ry * 0.32}
        rx={rear.rx * 0.32}
        ry={rear.ry * 0.26}
        fill="#fff"
        opacity="0.28"
      />
      <ellipse
        cx={front.cx - front.rx * 0.22}
        cy={front.cy - front.ry * 0.3}
        rx={front.rx * 0.28}
        ry={front.ry * 0.22}
        fill="#fff"
        opacity="0.2"
      />
    </g>
  );
}

/** Classic realistic: scrotum, slim shaft, mushroom glans. */
function RealisticToy({
  id,
  racer,
}: Readonly<{ id: string; racer: DerbyRacer }>) {
  return (
    <g className="derby-toy-figure">
      <path
        d="M50 112 C92 58 148 52 188 64 C196 68 198 76 198 84 C198 92 196 100 188 104 C148 116 100 120 72 124 C60 126 50 120 48 114 C48 110 48 110 50 112 Z"
        fill={`url(#${id}-body)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="58"
        cy="118"
        rx="28"
        ry="20"
        fill={`url(#${id}-body)`}
      />
      <path
        d="M108 62 C122 76 132 94 134 106"
        fill="none"
        stroke={racer.hexDark}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M84 66 C128 58 168 60 190 72 C160 78 118 80 84 72 Z"
        fill="#fff"
        opacity="0.28"
      />

      <ellipse
        cx="192"
        cy="84"
        rx="10"
        ry="28"
        fill={racer.hexDark}
        stroke="#1c1917"
        strokeWidth="4"
      />
      <path
        d="M196 56 C218 44 250 46 266 62 C276 72 276 90 264 102 C248 118 216 118 198 106 C192 102 190 94 190 84 C190 72 192 62 196 56 Z"
        fill={`url(#${id}-head)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M256 72 C262 80 262 90 256 96"
        fill="none"
        stroke={racer.hexDark}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="236" cy="68" rx="11" ry="7" fill="#fff" opacity="0.36" />
      <Scrotum
        id={id}
        rear={{ cx: 42, cy: 124, rx: 28, ry: 27 }}
        front={{ cx: 78, cy: 132, rx: 26, ry: 25 }}
      />
    </g>
  );
}

/** Curved G-spot: two large balls, banana shaft, bulbous tip. */
function CurvedToy({
  id,
  racer,
}: Readonly<{ id: string; racer: DerbyRacer }>) {
  return (
    <g className="derby-toy-figure">
      <path
        d="M56 108 C92 74 132 48 172 36 C204 26 232 34 244 52 C254 64 248 78 230 84 C196 94 154 98 112 108 C92 116 74 128 62 126 C54 118 50 112 56 108 Z"
        fill={`url(#${id}-body)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M84 92 C120 66 164 42 210 44"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.24"
      />
      <ellipse
        cx="58"
        cy="116"
        rx="32"
        ry="24"
        fill={`url(#${id}-body)`}
      />

      <ellipse
        cx="212"
        cy="44"
        rx="9"
        ry="24"
        fill={racer.hexDark}
        stroke="#1c1917"
        strokeWidth="4"
        transform="rotate(28 212 44)"
      />
      <path
        d="M214 20 C236 8 268 14 280 36 C288 50 282 70 262 78 C242 86 222 74 216 58 C212 46 212 30 214 20 Z"
        fill={`url(#${id}-head)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M270 38 C276 46 276 56 270 62"
        fill="none"
        stroke={racer.hexDark}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="246" cy="34" rx="10" ry="6" fill="#fff" opacity="0.36" />
      <Scrotum
        id={id}
        rear={{ cx: 40, cy: 118, rx: 32, ry: 32 }}
        front={{ cx: 82, cy: 128, rx: 30, ry: 30 }}
      />
    </g>
  );
}

/** Ribbed: round scrotum, continuous shaft, raised ring ridges. */
function RibbedToy({
  id,
  racer,
}: Readonly<{ id: string; racer: DerbyRacer }>) {
  return (
    <g className="derby-toy-figure">
      <path
        d="M48 118 C90 68 150 46 192 58 C202 62 206 74 206 86 C206 98 202 108 192 112 C150 124 102 128 72 132 C58 130 50 124 48 118 Z"
        fill={`url(#${id}-body)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="56"
        cy="124"
        rx="30"
        ry="22"
        fill={`url(#${id}-body)`}
      />
      {[120, 138, 156, 174, 192].map((x) => (
        <ellipse
          key={x}
          cx={x}
          cy="86"
          rx="5"
          ry="30"
          fill={racer.hexDark}
          stroke="#1c1917"
          strokeWidth="4"
        />
      ))}
      <path
        d="M96 64 C136 52 172 54 196 66"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.22"
      />

      <ellipse
        cx="198"
        cy="86"
        rx="9"
        ry="24"
        fill={racer.hexDark}
        stroke="#1c1917"
        strokeWidth="4"
      />
      <path
        d="M202 58 C224 46 260 48 276 66 C286 78 284 96 268 106 C250 118 218 116 204 102 C198 96 196 90 196 86 C196 76 198 66 202 58 Z"
        fill={`url(#${id}-head)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M264 76 C270 84 270 94 264 100"
        fill="none"
        stroke={racer.hexDark}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="244" cy="72" rx="10" ry="7" fill="#fff" opacity="0.34" />
      <Scrotum
        id={id}
        rear={{ cx: 40, cy: 126, rx: 32, ry: 32 }}
        front={{ cx: 80, cy: 134, rx: 30, ry: 30 }}
      />
    </g>
  );
}

/** Thick/chubby: heavy girth, oversized glans, matching scrotum. */
function ThickToy({
  id,
  racer,
}: Readonly<{ id: string; racer: DerbyRacer }>) {
  return (
    <g className="derby-toy-figure">
      <path
        d="M54 114 C96 46 150 34 182 52 C192 60 196 72 196 84 C196 98 190 110 178 116 C148 128 108 130 80 132 C66 134 52 128 50 120 C48 114 50 112 54 114 Z"
        fill={`url(#${id}-body)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="64"
        cy="124"
        rx="34"
        ry="24"
        fill={`url(#${id}-body)`}
      />
      <path
        d="M122 50 C136 74 144 100 142 118"
        fill="none"
        stroke={racer.hexDark}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M106 52 C144 42 170 48 186 66 C158 74 126 76 106 64 Z"
        fill="#fff"
        opacity="0.24"
      />

      <ellipse
        cx="188"
        cy="84"
        rx="12"
        ry="36"
        fill={racer.hexDark}
        stroke="#1c1917"
        strokeWidth="4.5"
      />
      <path
        d="M190 44 C218 28 262 32 280 56 C292 72 288 98 266 112 C242 128 202 124 188 106 C182 98 180 90 180 82 C180 66 184 52 190 44 Z"
        fill={`url(#${id}-head)`}
        stroke="#1c1917"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M268 68 C276 80 276 94 268 104"
        fill="none"
        stroke={racer.hexDark}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <ellipse cx="244" cy="60" rx="14" ry="9" fill="#fff" opacity="0.34" />
      <Scrotum
        id={id}
        rear={{ cx: 42, cy: 122, rx: 40, ry: 38 }}
        front={{ cx: 90, cy: 132, rx: 40, ry: 38 }}
      />
    </g>
  );
}

const TOY_SHAPES: Record<
  DerbyRacerId,
  (props: { id: string; racer: DerbyRacer }) => ReactNode
> = {
  red: RealisticToy,
  blue: CurvedToy,
  green: RibbedToy,
  yellow: ThickToy,
};

const SPRAY_ORIGIN: Record<
  DerbyRacerId,
  { x: number; y: number; rotate: number }
> = {
  red: { x: 270, y: 82, rotate: 6 },
  blue: { x: 283, y: 38, rotate: -28 },
  green: { x: 279, y: 86, rotate: 4 },
  yellow: { x: 288, y: 84, rotate: 7 },
};

const SPRAY_DROPS = [
  { dx: 36, dy: -2, rx: 5, ry: 6, delay: 0, dur: 0.58 },
  { dx: 58, dy: -14, rx: 7, ry: 9, delay: 0.05, dur: 0.7 },
  { dx: 74, dy: 4, rx: 9, ry: 11, delay: 0.08, dur: 0.76 },
  { dx: 92, dy: -8, rx: 11, ry: 13, delay: 0.02, dur: 0.84 },
  { dx: 48, dy: 12, rx: 6, ry: 7, delay: 0.14, dur: 0.62 },
  { dx: 80, dy: -22, rx: 8, ry: 10, delay: 0.11, dur: 0.78 },
  { dx: 86, dy: 16, rx: 9, ry: 10, delay: 0.18, dur: 0.72 },
  { dx: 42, dy: -10, rx: 4, ry: 5, delay: 0.22, dur: 0.5 },
  { dx: 104, dy: 2, rx: 10, ry: 12, delay: 0.09, dur: 0.9 },
  { dx: 64, dy: 20, rx: 6, ry: 8, delay: 0.2, dur: 0.66 },
  { dx: 70, dy: -1, rx: 5, ry: 6, delay: 0.28, dur: 0.6 },
  { dx: 96, dy: -16, rx: 7, ry: 9, delay: 0.16, dur: 0.8 },
] as const;

function WinnerSpray({
  id,
  racerId,
}: Readonly<{ id: string; racerId: DerbyRacerId }>) {
  const origin = SPRAY_ORIGIN[racerId];

  return (
    <g
      className="derby-toy-spray"
      transform={`translate(${origin.x} ${origin.y}) rotate(${origin.rotate})`}
    >
      <ellipse
        className="derby-toy-spray-burst"
        cx="6"
        cy="0"
        rx="8"
        ry="7"
        fill={`url(#${id}-spray)`}
      />
      <ellipse
        className="derby-toy-spray-stream"
        cx="34"
        cy="0"
        rx="34"
        ry="7"
        fill={`url(#${id}-spray)`}
      />
      <ellipse
        className="derby-toy-spray-stream derby-toy-spray-stream-late"
        cx="48"
        cy="1"
        rx="42"
        ry="5"
        fill={`url(#${id}-spray)`}
        opacity="0.78"
      />
      {SPRAY_DROPS.map((drop) => (
        <ellipse
          key={`${drop.dx}-${drop.dy}-${drop.delay}`}
          className="derby-toy-spray-drop"
          cx="0"
          cy="0"
          rx={drop.rx}
          ry={drop.ry}
          fill={`url(#${id}-spray)`}
        >
          <animate
            attributeName="cx"
            from="0"
            to={drop.dx}
            dur={`${drop.dur}s`}
            begin={`${drop.delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            from="0"
            to={drop.dy}
            dur={`${drop.dur}s`}
            begin={`${drop.delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.1;0.55;1"
            dur={`${drop.dur}s`}
            begin={`${drop.delay}s`}
            repeatCount="indefinite"
          />
        </ellipse>
      ))}
    </g>
  );
}

export function DerbyToy({
  racer,
  isWinner = false,
}: Readonly<{ racer: DerbyRacer; isWinner?: boolean }>) {
  const id = `derby-toy-${racer.id}`;
  const Shape = TOY_SHAPES[racer.id];

  return (
    <div className={`derby-toy${isWinner ? " is-winner" : ""}`}>
      <svg
        className="derby-horse-svg derby-toy-svg"
        viewBox="0 0 280 176"
        aria-hidden
        focusable="false"
      >
        <ToyPaint id={id} racer={racer} />
        <BuzzMarks racer={racer} />
        <Shape id={id} racer={racer} />
        <WinnerSpray id={id} racerId={racer.id} />
      </svg>
    </div>
  );
}
