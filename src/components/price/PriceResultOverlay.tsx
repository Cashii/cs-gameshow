"use client";

import type { CSSProperties } from "react";

const CONFETTI = [
  { left: "4%", delay: "0s", dur: "1.9s", color: "#ffd100", w: 14, h: 22, rot: 18, shape: "rect" },
  { left: "9%", delay: "0.18s", dur: "2.3s", color: "#e31c23", w: 10, h: 18, rot: -24, shape: "rect" },
  { left: "14%", delay: "0.42s", dur: "1.7s", color: "#13b4e6", w: 16, h: 16, rot: 40, shape: "circle" },
  { left: "19%", delay: "0.08s", dur: "2.1s", color: "#ff6b00", w: 12, h: 26, rot: -12, shape: "rect" },
  { left: "24%", delay: "0.55s", dur: "1.8s", color: "#fff6d8", w: 8, h: 20, rot: 28, shape: "rect" },
  { left: "29%", delay: "0.3s", dur: "2.4s", color: "#7b2d8e", w: 14, h: 14, rot: -36, shape: "circle" },
  { left: "34%", delay: "0.12s", dur: "2s", color: "#ffd100", w: 11, h: 24, rot: 8, shape: "rect" },
  { left: "39%", delay: "0.48s", dur: "1.6s", color: "#e31c23", w: 18, h: 10, rot: -48, shape: "rect" },
  { left: "44%", delay: "0.22s", dur: "2.2s", color: "#13b4e6", w: 9, h: 22, rot: 16, shape: "rect" },
  { left: "49%", delay: "0.05s", dur: "1.85s", color: "#ff6b00", w: 15, h: 15, rot: -8, shape: "circle" },
  { left: "54%", delay: "0.38s", dur: "2.15s", color: "#fff6d8", w: 12, h: 20, rot: 32, shape: "rect" },
  { left: "59%", delay: "0.15s", dur: "1.95s", color: "#ffd100", w: 10, h: 26, rot: -20, shape: "rect" },
  { left: "64%", delay: "0.5s", dur: "2.05s", color: "#7b2d8e", w: 16, h: 12, rot: 44, shape: "rect" },
  { left: "69%", delay: "0.28s", dur: "1.7s", color: "#e31c23", w: 13, h: 13, rot: -28, shape: "circle" },
  { left: "74%", delay: "0.1s", dur: "2.35s", color: "#13b4e6", w: 11, h: 24, rot: 12, shape: "rect" },
  { left: "79%", delay: "0.44s", dur: "1.8s", color: "#ff6b00", w: 8, h: 18, rot: -40, shape: "rect" },
  { left: "84%", delay: "0.2s", dur: "2.1s", color: "#ffd100", w: 17, h: 11, rot: 6, shape: "rect" },
  { left: "89%", delay: "0.36s", dur: "1.9s", color: "#fff6d8", w: 14, h: 14, rot: -16, shape: "circle" },
  { left: "93%", delay: "0.02s", dur: "2.25s", color: "#e31c23", w: 10, h: 22, rot: 22, shape: "rect" },
  { left: "7%", delay: "0.62s", dur: "2s", color: "#13b4e6", w: 12, h: 16, rot: -10, shape: "rect" },
  { left: "22%", delay: "0.7s", dur: "1.75s", color: "#ffd100", w: 9, h: 20, rot: 36, shape: "rect" },
  { left: "47%", delay: "0.58s", dur: "2.3s", color: "#7b2d8e", w: 11, h: 23, rot: -22, shape: "rect" },
  { left: "71%", delay: "0.66s", dur: "1.65s", color: "#fff6d8", w: 15, h: 10, rot: 14, shape: "rect" },
  { left: "86%", delay: "0.74s", dur: "2.05s", color: "#ff6b00", w: 13, h: 18, rot: -34, shape: "rect" },
] as const;

const FLOATERS = [
  { src: "/price-order/star.svg", left: "8%", delay: "0.05s", size: "4.2rem", kind: "star" },
  { src: "/price-order/coin.svg", left: "18%", delay: "0.28s", size: "3.4rem", kind: "coin" },
  { src: "/price-order/sparkle.svg", left: "28%", delay: "0.12s", size: "3rem", kind: "sparkle" },
  { src: "/price-order/star.svg", left: "38%", delay: "0.4s", size: "5rem", kind: "star" },
  { src: "/price-order/coin.svg", left: "50%", delay: "0.18s", size: "3.8rem", kind: "coin" },
  { src: "/price-order/sparkle.svg", left: "61%", delay: "0.5s", size: "2.8rem", kind: "sparkle" },
  { src: "/price-order/star.svg", left: "72%", delay: "0.08s", size: "4.6rem", kind: "star" },
  { src: "/price-order/coin.svg", left: "82%", delay: "0.34s", size: "3.2rem", kind: "coin" },
  { src: "/price-order/sparkle.svg", left: "91%", delay: "0.22s", size: "3.4rem", kind: "sparkle" },
  { src: "/price-order/star.svg", left: "12%", delay: "0.62s", size: "3.2rem", kind: "star" },
  { src: "/price-order/coin.svg", left: "66%", delay: "0.7s", size: "2.8rem", kind: "coin" },
] as const;

const ASH = [
  { left: "12%", delay: "0s", dur: "2.4s" },
  { left: "28%", delay: "0.25s", dur: "2.8s" },
  { left: "44%", delay: "0.1s", dur: "2.2s" },
  { left: "61%", delay: "0.4s", dur: "2.6s" },
  { left: "77%", delay: "0.18s", dur: "2.3s" },
  { left: "88%", delay: "0.5s", dur: "2.7s" },
] as const;

export function PriceResultOverlay({
  correct,
  message,
}: Readonly<{ correct: boolean; message: string }>) {
  return (
    <div
      className={`price-result-overlay${correct ? " win" : " lose"}`}
      role="status"
      aria-live="assertive"
    >
      <div className="price-result-mask" />
      {correct ? (
        <>
          <div className="price-result-burst" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="price-result-confetti" aria-hidden>
            {CONFETTI.map((piece) => (
              <span
                key={`${piece.left}-${piece.delay}`}
                className={`price-result-confetti-piece ${piece.shape}`}
                style={
                  {
                    left: piece.left,
                    width: piece.w,
                    height: piece.h,
                    background: piece.color,
                    animationDelay: piece.delay,
                    animationDuration: piece.dur,
                    "--confetti-rot": `${piece.rot}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="price-result-floaters" aria-hidden>
            {FLOATERS.map((asset) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${asset.src}-${asset.left}-${asset.delay}`}
                src={asset.src}
                alt=""
                className={`price-result-floater ${asset.kind}`}
                style={{
                  left: asset.left,
                  width: asset.size,
                  height: asset.size,
                  animationDelay: asset.delay,
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="price-result-x" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/price-order/buzz.svg" alt="" />
          </div>
          <div className="price-result-ash" aria-hidden>
            {ASH.map((flake) => (
              <span
                key={`${flake.left}-${flake.delay}`}
                style={{
                  left: flake.left,
                  animationDelay: flake.delay,
                  animationDuration: flake.dur,
                }}
              />
            ))}
          </div>
        </>
      )}
      <p className="price-result-message">{message}</p>
    </div>
  );
}
