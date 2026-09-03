"use client";

import { memo, type CSSProperties } from "react";
import { GAMESHOW_LOGO_ART } from "@/lib/gameshow-logo";
import "@/styles/gameshow-logo.css";

export { GAMESHOW_LOGO_ART };

type GameshowLogoVariant = keyof typeof GAMESHOW_LOGO_ART;

type SparkleTone = "gold" | "green" | "purple";

type Sparkle = {
  x: number;
  y: number;
  size: number;
  delay: string;
  duration: string;
  tone?: SparkleTone;
  hot?: boolean;
};

const SPARKLES: Sparkle[] = [
  { x: 623, y: 272, size: 18, delay: "0s", duration: "2.5s" },
  { x: 742, y: 318, size: 10, delay: "0.35s", duration: "2.1s" },
  { x: 838, y: 392, size: 14, delay: "0.8s", duration: "2.4s" },
  { x: 886, y: 478, size: 11, delay: "0.15s", duration: "2.2s" },
  { x: 812, y: 582, size: 13, delay: "1.1s", duration: "2.6s" },
  { x: 724, y: 658, size: 9, delay: "0.55s", duration: "2s" },
  { x: 623, y: 702, size: 16, delay: "0.9s", duration: "2.7s" },
  { x: 512, y: 650, size: 10, delay: "0.2s", duration: "2.15s" },
  { x: 418, y: 568, size: 13, delay: "1.3s", duration: "2.35s" },
  { x: 364, y: 478, size: 11, delay: "0.7s", duration: "2.45s" },
  { x: 430, y: 368, size: 12, delay: "0.45s", duration: "2.3s" },
  { x: 518, y: 308, size: 8, delay: "1.05s", duration: "1.9s" },
];

const DIAMOND = {
  top: [349, 48] as const,
  right: [642, 223] as const,
  bottom: [349, 398] as const,
  left: [56, 223] as const,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function along(
  from: readonly [number, number],
  to: readonly [number, number],
  t: number,
): [number, number] {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];
}

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const TONES: SparkleTone[] = ["gold", "green", "purple"];

function buildNoshadowSparkles(): Sparkle[] {
  const sparkles: Sparkle[] = [
    { x: DIAMOND.top[0], y: DIAMOND.top[1], size: 24, delay: "0s", duration: "1.7s", tone: "gold", hot: true },
    { x: DIAMOND.right[0], y: DIAMOND.right[1], size: 20, delay: "0.4s", duration: "1.85s", tone: "purple", hot: true },
    { x: DIAMOND.bottom[0], y: DIAMOND.bottom[1], size: 22, delay: "0.85s", duration: "1.65s", tone: "gold", hot: true },
    { x: DIAMOND.left[0], y: DIAMOND.left[1], size: 20, delay: "1.2s", duration: "1.9s", tone: "green", hot: true },
  ];

  const edges: Array<[readonly [number, number], readonly [number, number]]> = [
    [DIAMOND.top, DIAMOND.right],
    [DIAMOND.right, DIAMOND.bottom],
    [DIAMOND.bottom, DIAMOND.left],
    [DIAMOND.left, DIAMOND.top],
  ];

  edges.forEach((edge, edgeIndex) => {
    for (let i = 2; i <= 10; i += 2) {
      const t = i / 12;
      const [x, y] = along(edge[0], edge[1], t);
      const n = edgeIndex * 20 + i;
      sparkles.push({
        x,
        y,
        size: 8 + seeded(n) * 10,
        delay: `${seeded(n + 40) * 2.2}s`,
        duration: `${1.15 + seeded(n + 80) * 1.1}s`,
        tone: TONES[n % TONES.length],
        hot: seeded(n + 3) > 0.62,
      });
    }
  });

  const extras: Array<[number, number]> = [
    [280, 110],
    [349, 96],
    [490, 148],
    [250, 175],
    [410, 168],
    [160, 250],
    [349, 200],
    [530, 255],
    [280, 320],
    [430, 318],
    [120, 223],
    [349, 70],
  ];

  extras.forEach(([x, y], index) => {
    const n = 200 + index;
    sparkles.push({
      x,
      y,
      size: 7 + seeded(n) * 10,
      delay: `${seeded(n + 11) * 2.4}s`,
      duration: `${1.05 + seeded(n + 22) * 1.25}s`,
      tone: TONES[index % TONES.length],
      hot: seeded(n + 7) > 0.5,
    });
  });

  return sparkles;
}

const NOSHADOW_SPARKLES = buildNoshadowSparkles();

function sparklePath(size: number) {
  const r = size / 2;
  const inner = r * 0.12;
  return `M0 ${-r} C${inner} ${-r * 0.34} ${r * 0.34} ${-inner} ${r} 0 C${r * 0.34} ${inner} ${inner} ${r * 0.34} 0 ${r} C${-inner} ${r * 0.34} ${-r * 0.34} ${inner} ${-r} 0 C${-r * 0.34} ${-inner} ${-inner} ${-r * 0.34} 0 ${-r}Z`;
}

if (typeof window !== "undefined") {
  for (const art of Object.values(GAMESHOW_LOGO_ART)) {
    const preload = new Image();
    preload.src = art.src;
  }
}

export const GameshowLogo = memo(function GameshowLogo({
  className,
  alt = "Jacked Up",
  variant = "default",
  zoom = 1,
  paused = false,
}: Readonly<{
  className?: string;
  alt?: string;
  variant?: GameshowLogoVariant;
  zoom?: number;
  paused?: boolean;
}>) {
  const art = GAMESHOW_LOGO_ART[variant];
  const sparkles = variant === "noshadow" ? NOSHADOW_SPARKLES : SPARKLES;

  return (
    <span
      className={[
        "gameshow-logo",
        variant === "noshadow" ? "gameshow-logo-noshadow" : "",
        paused ? "gameshow-logo-paused" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--gameshow-logo-zoom": String(zoom) } as CSSProperties}
    >
      <span className="gameshow-logo-stage">
        {/* Decorative event logo; SVG uses screen blending meant for dark backgrounds. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.src}
          alt={alt}
          className="gameshow-logo-art"
          decoding="async"
          fetchPriority={variant === "default" ? "high" : "auto"}
          draggable={false}
        />
        <svg
          className="gameshow-logo-sparkles"
          viewBox={`0 0 ${art.width} ${art.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {sparkles.map((sparkle, index) => (
            <g
              key={`${index}-${sparkle.x}-${sparkle.y}`}
              transform={`translate(${sparkle.x} ${sparkle.y})`}
            >
              <g
                className={[
                  "gameshow-logo-sparkle-spin",
                  sparkle.hot ? "gameshow-logo-sparkle-hot" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  animationDelay: sparkle.delay,
                  animationDuration: sparkle.duration,
                }}
              >
                <path
                  className={
                    sparkle.tone
                      ? `gameshow-logo-sparkle-${sparkle.tone}-glow`
                      : "gameshow-logo-sparkle-glow"
                  }
                  d={sparklePath(sparkle.size * 1.55)}
                />
                <path
                  className={[
                    "gameshow-logo-sparkle",
                    sparkle.tone ? `gameshow-logo-sparkle-${sparkle.tone}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  d={sparklePath(sparkle.size)}
                />
              </g>
            </g>
          ))}
        </svg>
      </span>
    </span>
  );
});
