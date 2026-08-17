"use client";

import { useMemo } from "react";
import LetterTile from "./LetterTile";

interface LetterBoardProps {
  readonly phrase: string;
  readonly revealedLetters: string[];
  readonly revealedAll: boolean;
  readonly zoom?: number;
}

export default function LetterBoard({
  phrase,
  revealedLetters,
  revealedAll,
  zoom = 1,
}: LetterBoardProps) {
  const phraseLength = useMemo(() => {
    if (!phrase) return 0;
    return phrase
      .split("")
      .filter(
        (char) =>
          char !== " " &&
          char !== "-" &&
          char !== "'" &&
          char !== "’" &&
          char !== "—" &&
          char !== "–",
      ).length;
  }, [phrase]);

  const spaceCount = useMemo(() => {
    if (!phrase) return 0;
    return phrase.split(" ").length - 1;
  }, [phrase]);

  const totalDisplayChars = phraseLength + spaceCount;

  const baseScale = useMemo(() => {
    if (!phrase || totalDisplayChars === 0) return 1;
    const avgCharsPerWord =
      phraseLength / Math.max(1, phrase.split(" ").length);
    const estimatedTilesPerRow = Math.max(
      8,
      Math.min(15, Math.ceil(avgCharsPerWord * 1.2)),
    );
    const estimatedRows = Math.ceil(totalDisplayChars / estimatedTilesPerRow);
    const availableWidth = 100 * 0.85;
    const availableHeight = 100 * 0.75;
    const widthScale = availableWidth / estimatedTilesPerRow / 16;
    const heightScale = availableHeight / estimatedRows / 24;
    const scale = Math.min(widthScale, heightScale, 1) * 0.85;
    return Math.max(0.3, Math.min(1, scale));
  }, [phrase, totalDisplayChars, phraseLength]);

  if (!phrase) {
    return (
      <div
        className="shiny-border"
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "calc(100vh - 2rem)",
          maxWidth: "calc(100vw - 2rem)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          className="board-gradient mx-auto flex max-w-full flex-wrap items-center justify-center rounded-2xl"
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            overflow: "visible",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "clamp(2rem, 5vw, 5rem)",
            paddingBottom: "clamp(3rem, 7vw, 8rem)",
            paddingLeft: "clamp(1rem, 3vw, 3rem)",
            paddingRight: "clamp(1rem, 3vw, 3rem)",
          }}
        >
          <div
            className="flex flex-col items-center justify-center"
            style={{ position: "relative", zIndex: 1, gap: `${6 * zoom * 0.25}rem` }}
          >
            <div
              className="flex preparing-placeholders"
              style={{
                gap: `clamp(${0.2 * zoom}rem, ${0.8 * zoom}vw, ${0.8 * zoom}rem)`,
              }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="preparing-placeholder rounded-md bg-white shadow-xl"
                  style={{
                    width: `clamp(${5 * zoom}rem, ${16 * zoom}vw, ${28 * zoom}rem)`,
                    height: `clamp(${8 * zoom}rem, ${24 * zoom}vw, ${42 * zoom}rem)`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
            <p
              className="preparing-text font-gameshow text-center text-white/80"
              style={{
                fontSize: `clamp(${1.5 * zoom}rem, ${4 * zoom}vw, ${3 * zoom}rem)`,
                letterSpacing: "0.28em",
              }}
            >
              PREPARING BOARD
            </p>
          </div>
        </div>
      </div>
    );
  }

  const revealedSet = new Set(revealedLetters.map((l) => l.toLowerCase()));
  const words = phrase.split(" ");
  const parts: Array<{ type: "word" | "space"; content: string; id: string }> =
    [];

  words.forEach((word, wordIndex) => {
    parts.push({ type: "word", content: word, id: `word-${wordIndex}-${word}` });
    if (wordIndex < words.length - 1) {
      parts.push({ type: "space", content: " ", id: `space-${wordIndex}` });
    }
  });

  const renderCharacter = (char: string, index: number) => {
    if (
      char === "-" ||
      char === "'" ||
      char === "’" ||
      char === "—" ||
      char === "–"
    ) {
      return null;
    }

    if (!/[a-zA-Z]/.test(char)) {
      return (
        <div
          key={index}
          className="flex items-center justify-center rounded-md p-0.5"
          style={{
            width: `clamp(${5 * baseScale * zoom}rem, ${16 * baseScale * zoom}vw, ${28 * baseScale * zoom}rem)`,
            height: `clamp(${8 * baseScale * zoom}rem, ${24 * baseScale * zoom}vw, ${42 * baseScale * zoom}rem)`,
          }}
        >
          <span
            className="font-gameshow leading-none text-white select-none"
            style={{
              fontSize: `clamp(${5 * baseScale * zoom}rem, ${16 * baseScale * zoom}vw, ${24 * baseScale * zoom}rem)`,
            }}
          >
            {char}
          </span>
        </div>
      );
    }

    const isRevealed = revealedAll || revealedSet.has(char.toLowerCase());
    return (
      <LetterTile
        key={index}
        letter={isRevealed ? char : null}
        isRevealed={isRevealed}
        zoom={zoom}
        baseScale={baseScale}
      />
    );
  };

  return (
    <div
      className="shiny-border"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "calc(100vh - 2rem)",
        maxWidth: "calc(100vw - 2rem)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        className="board-gradient mx-auto flex max-w-full flex-wrap items-center justify-center rounded-2xl"
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "calc(100vh - 4rem)",
          boxSizing: "border-box",
          overflow: "visible",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "clamp(1rem, 3vh, 3rem)",
          paddingBottom: "clamp(1rem, 3vh, 3rem)",
          paddingLeft: "clamp(1rem, 2vw, 3rem)",
          paddingRight: "clamp(1rem, 2vw, 3rem)",
        }}
      >
        <div
          style={{
            gap: `clamp(${0.3 * baseScale * zoom}rem, ${1 * baseScale * zoom}vw, ${1 * baseScale * zoom}rem)`,
            rowGap: `clamp(${0.3 * baseScale * zoom}rem, ${0.8 * baseScale * zoom}vw, ${0.8 * baseScale * zoom}rem)`,
            columnGap: `clamp(${0.4 * baseScale * zoom}rem, ${1.2 * baseScale * zoom}vw, ${1.2 * baseScale * zoom}rem)`,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {parts.map((part, partIndex) => {
            if (part.type === "space") {
              return (
                <div
                  key={part.id}
                  className="shrink-0"
                  style={{
                    width: `clamp(${4 * baseScale * zoom}rem, ${12 * baseScale * zoom}vw, ${20 * baseScale * zoom}rem)`,
                    height: `clamp(${6 * baseScale * zoom}rem, ${18 * baseScale * zoom}vw, ${30 * baseScale * zoom}rem)`,
                  }}
                />
              );
            }

            let wordStartPos = 0;
            for (let i = 0; i < partIndex; i++) {
              if (parts[i].type === "word") {
                wordStartPos += parts[i].content.length;
              } else {
                wordStartPos += 1;
              }
            }

            const wordChars = part.content.split("");
            return (
              <div
                key={part.id}
                className="inline-flex shrink-0 items-center"
                style={{
                  gap: `clamp(${0.2 * baseScale * zoom}rem, ${1 * baseScale * zoom}vw, ${1 * baseScale * zoom}rem)`,
                }}
              >
                {wordChars
                  .map((char, charIndex) =>
                    renderCharacter(char, wordStartPos + charIndex),
                  )
                  .filter(Boolean)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
