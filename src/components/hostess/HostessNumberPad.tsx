"use client";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "back"],
] as const;

type HostessNumberPadProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function HostessNumberPad({
  value,
  onChange,
  maxLength = 8,
}: Readonly<HostessNumberPadProps>) {
  const press = (key: (typeof KEYS)[number][number]) => {
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "clear") {
      onChange("");
      return;
    }
    if (value.length >= maxLength) return;
    onChange(value + key);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-3 grid-rows-4 gap-2">
      {KEYS.flat().map((key) => {
        if (key === "back") {
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="flex min-h-0 items-center justify-center rounded-xl bg-neutral-800 text-2xl font-semibold text-neutral-200 active:bg-neutral-700"
              aria-label="Backspace"
            >
              ⌫
            </button>
          );
        }
        if (key === "clear") {
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="flex min-h-0 items-center justify-center rounded-xl bg-neutral-800 text-base font-semibold text-neutral-400 active:bg-neutral-700"
            >
              Clear
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className="flex min-h-0 items-center justify-center rounded-xl bg-neutral-800 text-4xl font-bold text-white active:bg-neutral-700"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
