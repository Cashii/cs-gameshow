import "@/styles/gameshow-logo.css";

const LOGO_ART = {
  default: { src: "/jackdup.svg", width: 1246, height: 947 },
  noshadow: { src: "/jackdup-noshadow.svg", width: 699, height: 463 },
} as const;

type GameshowLogoVariant = keyof typeof LOGO_ART;

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
  { x: 623, y: 272, size: 30, delay: "0s", duration: "2.5s" },
  { x: 742, y: 318, size: 16, delay: "0.35s", duration: "2.1s" },
  { x: 838, y: 392, size: 22, delay: "0.8s", duration: "2.4s" },
  { x: 886, y: 478, size: 18, delay: "0.15s", duration: "2.2s" },
  { x: 812, y: 582, size: 20, delay: "1.1s", duration: "2.6s" },
  { x: 724, y: 658, size: 14, delay: "0.55s", duration: "2s" },
  { x: 623, y: 702, size: 26, delay: "0.9s", duration: "2.7s" },
  { x: 512, y: 650, size: 15, delay: "0.2s", duration: "2.15s" },
  { x: 418, y: 568, size: 21, delay: "1.3s", duration: "2.35s" },
  { x: 364, y: 478, size: 17, delay: "0.7s", duration: "2.45s" },
  { x: 430, y: 368, size: 19, delay: "0.45s", duration: "2.3s" },
  { x: 518, y: 308, size: 13, delay: "1.05s", duration: "1.9s" },
  { x: 392, y: 412, size: 12, delay: "1.6s", duration: "2.05s" },
  { x: 548, y: 356, size: 11, delay: "0.25s", duration: "1.85s" },
  { x: 688, y: 348, size: 14, delay: "1.4s", duration: "2.2s" },
  { x: 792, y: 428, size: 12, delay: "0.65s", duration: "1.95s" },
  { x: 598, y: 430, size: 10, delay: "1.75s", duration: "1.8s" },
  { x: 710, y: 448, size: 11, delay: "0.95s", duration: "2.1s" },
  { x: 586, y: 548, size: 13, delay: "0.5s", duration: "2.25s" },
  { x: 668, y: 572, size: 12, delay: "1.2s", duration: "2s" },
  { x: 748, y: 538, size: 15, delay: "0.1s", duration: "2.4s" },
  { x: 804, y: 502, size: 11, delay: "1.55s", duration: "1.9s" },
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
    { x: DIAMOND.top[0], y: DIAMOND.top[1], size: 42, delay: "0s", duration: "1.7s", tone: "gold", hot: true },
    { x: DIAMOND.right[0], y: DIAMOND.right[1], size: 36, delay: "0.4s", duration: "1.85s", tone: "purple", hot: true },
    { x: DIAMOND.bottom[0], y: DIAMOND.bottom[1], size: 40, delay: "0.85s", duration: "1.65s", tone: "gold", hot: true },
    { x: DIAMOND.left[0], y: DIAMOND.left[1], size: 36, delay: "1.2s", duration: "1.9s", tone: "green", hot: true },
  ];

  const edges: Array<[readonly [number, number], readonly [number, number]]> = [
    [DIAMOND.top, DIAMOND.right],
    [DIAMOND.right, DIAMOND.bottom],
    [DIAMOND.bottom, DIAMOND.left],
    [DIAMOND.left, DIAMOND.top],
  ];

  edges.forEach((edge, edgeIndex) => {
    for (let i = 1; i <= 11; i += 1) {
      const t = i / 12;
      const [x, y] = along(edge[0], edge[1], t);
      const n = edgeIndex * 20 + i;
      sparkles.push({
        x,
        y,
        size: 14 + seeded(n) * 20,
        delay: `${seeded(n + 40) * 2.2}s`,
        duration: `${1.15 + seeded(n + 80) * 1.1}s`,
        tone: TONES[n % TONES.length],
        hot: seeded(n + 3) > 0.62,
      });
    }
  });

  const extras: Array<[number, number]> = [
    [210, 140],
    [280, 110],
    [349, 96],
    [420, 112],
    [490, 148],
    [180, 190],
    [250, 175],
    [330, 165],
    [410, 168],
    [500, 192],
    [160, 250],
    [240, 235],
    [320, 220],
    [380, 218],
    [460, 238],
    [530, 255],
    [200, 300],
    [280, 320],
    [349, 340],
    [430, 318],
    [510, 290],
    [349, 200],
    [300, 250],
    [400, 248],
    [120, 223],
    [580, 223],
    [349, 70],
    [349, 380],
  ];

  extras.forEach(([x, y], index) => {
    const n = 200 + index;
    sparkles.push({
      x,
      y,
      size: 12 + seeded(n) * 22,
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

function sparkleClassName(sparkle: Sparkle) {
  return [
    "gameshow-logo-sparkle",
    sparkle.tone ? `gameshow-logo-sparkle-${sparkle.tone}` : "",
    sparkle.hot ? "gameshow-logo-sparkle-hot" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function GameshowLogo({
  className,
  alt = "Jacked Up",
  variant = "default",
}: Readonly<{
  className?: string;
  alt?: string;
  variant?: GameshowLogoVariant;
}>) {
  const art = LOGO_ART[variant];
  const sparkles = variant === "noshadow" ? NOSHADOW_SPARKLES : SPARKLES;

  return (
    <span
      className={["gameshow-logo", variant === "noshadow" ? "gameshow-logo-noshadow" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Decorative event logo; SVG uses screen blending meant for dark backgrounds. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art.src} alt={alt} className="gameshow-logo-art" />
      <svg
        className="gameshow-logo-sparkles"
        viewBox={`0 0 ${art.width} ${art.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {sparkles.map((sparkle, index) => (
          <g key={`${index}-${sparkle.x}-${sparkle.y}`} transform={`translate(${sparkle.x} ${sparkle.y})`}>
            <path
              className={sparkleClassName(sparkle)}
              d={sparklePath(sparkle.size)}
              style={{
                animationDelay: sparkle.delay,
                animationDuration: sparkle.duration,
              }}
            />
          </g>
        ))}
      </svg>
    </span>
  );
}
