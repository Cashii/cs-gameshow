"use client";

import type { ReactNode } from "react";

const SPARKLES = [
  { top: "4%", left: "8%", delay: "0s", size: "0.85rem", tone: "gold", dur: "1.7s" },
  { top: "7%", left: "22%", delay: "0.35s", size: "0.5rem", tone: "white", dur: "2.1s" },
  { top: "5%", left: "41%", delay: "0.8s", size: "0.7rem", tone: "cyan", dur: "1.9s" },
  { top: "9%", left: "58%", delay: "0.15s", size: "0.45rem", tone: "gold", dur: "2.4s" },
  { top: "6%", left: "74%", delay: "1.1s", size: "0.95rem", tone: "white", dur: "1.6s" },
  { top: "11%", left: "89%", delay: "0.55s", size: "0.6rem", tone: "gold", dur: "2s" },
  { top: "18%", left: "5%", delay: "1.4s", size: "0.4rem", tone: "cyan", dur: "1.8s" },
  { top: "21%", left: "16%", delay: "0.25s", size: "0.75rem", tone: "gold", dur: "2.2s" },
  { top: "24%", left: "93%", delay: "0.9s", size: "0.55rem", tone: "white", dur: "1.7s" },
  { top: "31%", left: "3%", delay: "1.7s", size: "0.65rem", tone: "gold", dur: "2.5s" },
  { top: "33%", left: "96%", delay: "0.4s", size: "0.8rem", tone: "cyan", dur: "1.9s" },
  { top: "42%", left: "6%", delay: "2s", size: "0.45rem", tone: "white", dur: "1.6s" },
  { top: "44%", left: "94%", delay: "0.65s", size: "0.7rem", tone: "gold", dur: "2.1s" },
  { top: "51%", left: "4%", delay: "1.2s", size: "0.5rem", tone: "cyan", dur: "1.8s" },
  { top: "54%", left: "97%", delay: "0.1s", size: "0.9rem", tone: "gold", dur: "2.3s" },
  { top: "61%", left: "8%", delay: "1.55s", size: "0.55rem", tone: "white", dur: "1.7s" },
  { top: "64%", left: "91%", delay: "0.75s", size: "0.4rem", tone: "gold", dur: "2s" },
  { top: "70%", left: "11%", delay: "0.3s", size: "0.7rem", tone: "cyan", dur: "1.9s" },
  { top: "73%", left: "88%", delay: "1.85s", size: "0.6rem", tone: "white", dur: "2.2s" },
  { top: "78%", left: "19%", delay: "0.5s", size: "0.85rem", tone: "gold", dur: "1.6s" },
  { top: "81%", left: "36%", delay: "1.3s", size: "0.45rem", tone: "white", dur: "2.1s" },
  { top: "77%", left: "63%", delay: "0.2s", size: "0.5rem", tone: "cyan", dur: "1.8s" },
  { top: "83%", left: "79%", delay: "1s", size: "0.75rem", tone: "gold", dur: "2.4s" },
  { top: "88%", left: "6%", delay: "0.45s", size: "0.55rem", tone: "white", dur: "1.7s" },
  { top: "91%", left: "28%", delay: "1.65s", size: "0.4rem", tone: "gold", dur: "2s" },
  { top: "86%", left: "48%", delay: "0.85s", size: "0.65rem", tone: "cyan", dur: "1.9s" },
  { top: "90%", left: "71%", delay: "0.05s", size: "0.5rem", tone: "white", dur: "2.3s" },
  { top: "93%", left: "92%", delay: "1.15s", size: "0.8rem", tone: "gold", dur: "1.8s" },
  { top: "15%", left: "48%", delay: "0.6s", size: "0.35rem", tone: "white", dur: "1.5s" },
  { top: "38%", left: "18%", delay: "1.9s", size: "0.4rem", tone: "gold", dur: "2.2s" },
  { top: "39%", left: "81%", delay: "0.7s", size: "0.35rem", tone: "cyan", dur: "1.6s" },
  { top: "67%", left: "24%", delay: "1.05s", size: "0.4rem", tone: "white", dur: "2s" },
  { top: "66%", left: "76%", delay: "0.2s", size: "0.35rem", tone: "gold", dur: "1.7s" },
] as const;

const SPECKS = [
  { top: "12%", left: "31%", delay: "0.2s" },
  { top: "17%", left: "67%", delay: "0.9s" },
  { top: "26%", left: "12%", delay: "1.4s" },
  { top: "29%", left: "84%", delay: "0.4s" },
  { top: "47%", left: "15%", delay: "1.8s" },
  { top: "49%", left: "86%", delay: "0.1s" },
  { top: "58%", left: "21%", delay: "1.1s" },
  { top: "59%", left: "79%", delay: "0.6s" },
  { top: "74%", left: "8%", delay: "1.5s" },
  { top: "75%", left: "94%", delay: "0.3s" },
  { top: "84%", left: "41%", delay: "0.8s" },
  { top: "85%", left: "58%", delay: "1.7s" },
  { top: "8%", left: "51%", delay: "0.5s" },
  { top: "36%", left: "7%", delay: "1.2s" },
  { top: "37%", left: "93%", delay: "0.15s" },
  { top: "95%", left: "18%", delay: "1.6s" },
  { top: "96%", left: "82%", delay: "0.7s" },
  { top: "22%", left: "39%", delay: "1s" },
] as const;

export function PriceShowStage({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="price-stage price-stage-show">
      <div className="price-tpir-bg" aria-hidden>
        <div className="price-tpir-rays" />
        <div className="price-tpir-shimmer" />
        <div className="price-tpir-arc" />
        <div className="price-tpir-dots" />
        <div className="price-tpir-glitter price-tpir-glitter-a" />
        <div className="price-tpir-glitter price-tpir-glitter-b" />
        <span className="price-tpir-star price-tpir-star-1" />
        <span className="price-tpir-star price-tpir-star-2" />
        <span className="price-tpir-star price-tpir-star-3" />
        <span className="price-tpir-star price-tpir-star-4" />
        <span className="price-tpir-star price-tpir-star-5" />
        <span className="price-tpir-star price-tpir-star-6" />
        <span className="price-tpir-dollar price-tpir-dollar-1">$</span>
        <span className="price-tpir-dollar price-tpir-dollar-2">$</span>
        <span className="price-tpir-dollar price-tpir-dollar-3">$</span>
        <span className="price-tpir-dollar price-tpir-dollar-4">$</span>
        <span className="price-tpir-dollar price-tpir-dollar-5">$</span>
        <span className="price-tpir-dollar price-tpir-dollar-6">$</span>
        {SPARKLES.map((sparkle) => (
          <span
            key={`${sparkle.top}-${sparkle.left}`}
            className="price-tpir-sparkle"
            data-tone={sparkle.tone}
            style={{
              top: sparkle.top,
              left: sparkle.left,
              width: sparkle.size,
              height: sparkle.size,
              animationDelay: sparkle.delay,
              animationDuration: sparkle.dur,
            }}
          />
        ))}
        {SPECKS.map((speck) => (
          <span
            key={`speck-${speck.top}-${speck.left}`}
            className="price-tpir-speck"
            style={{
              top: speck.top,
              left: speck.left,
              animationDelay: speck.delay,
            }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
