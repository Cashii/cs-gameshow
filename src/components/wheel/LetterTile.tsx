"use client";

import { useEffect, useRef, useState } from "react";

interface LetterTileProps {
  readonly letter: string | null;
  readonly isRevealed: boolean;
  readonly zoom?: number;
  readonly baseScale?: number;
}

export default function LetterTile({
  letter,
  isRevealed,
  zoom = 1,
  baseScale = 1,
}: LetterTileProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const wasRevealedRef = useRef(isRevealed);

  useEffect(() => {
    const wasRevealed = wasRevealedRef.current;
    wasRevealedRef.current = isRevealed;

    if (isRevealed && !wasRevealed) {
      const frame = requestAnimationFrame(() => setShouldAnimate(true));
      const timer = setTimeout(() => setShouldAnimate(false), 800);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }

    if (!isRevealed && wasRevealed) {
      const frame = requestAnimationFrame(() => setShouldAnimate(false));
      return () => cancelAnimationFrame(frame);
    }
  }, [isRevealed]);

  return (
    <div
      className={`flex items-center justify-center rounded-md bg-white p-0.5 shadow-xl ${
        shouldAnimate ? "letter-reveal" : ""
      }`}
      style={{
        width: `clamp(${5 * baseScale * zoom}rem, ${16 * baseScale * zoom}vw, ${28 * baseScale * zoom}rem)`,
        height: `clamp(${8 * baseScale * zoom}rem, ${24 * baseScale * zoom}vw, ${42 * baseScale * zoom}rem)`,
        transformStyle: "preserve-3d",
      }}
    >
      {isRevealed && letter ? (
        <span
          className="font-gameshow leading-none text-black select-none"
          style={{
            fontSize: `clamp(${5 * baseScale * zoom}rem, ${16 * baseScale * zoom}vw, ${24 * baseScale * zoom}rem)`,
            lineHeight: "1",
          }}
        >
          {letter.toUpperCase()}
        </span>
      ) : (
        <span className="h-full w-full" />
      )}
    </div>
  );
}
