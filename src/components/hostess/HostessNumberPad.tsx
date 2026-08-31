"use client";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [",", "0", "-"],
  ["clear", "spacer", "back"],
] as const;

type PadKey = (typeof KEYS)[number][number];

type HostessNumberPadProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function HostessNumberPad({
  value,
  onChange,
  maxLength = 32,
}: Readonly<HostessNumberPadProps>) {
  const press = (key: PadKey) => {
    if (key === "spacer") return;
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "clear") {
      onChange("");
      return;
    }
    if (value.length >= maxLength) return;
    if ((key === "," || key === "-") && (!value || /[,-]$/.test(value))) return;

    const lastSep = Math.max(value.lastIndexOf(","), value.lastIndexOf("-"));
    const segment = lastSep === -1 ? value : value.slice(lastSep + 1);
    if (key === "0" && segment === "0") return;
    if (/^[1-9]$/.test(key) && segment === "0") {
      onChange(value.slice(0, -1) + key);
      return;
    }

    onChange(value + key);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-3 grid-rows-5 bg-neutral-900">
      {KEYS.flat().map((key) => {
        if (key === "spacer") {
          return <div key={key} aria-hidden />;
        }
        if (key === "back") {
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="flex min-h-0 items-center justify-center overflow-hidden bg-neutral-900 text-2xl font-semibold leading-none text-neutral-100 active:bg-neutral-800"
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
              className="flex min-h-0 items-center justify-center overflow-hidden bg-neutral-900 text-base font-semibold leading-none text-neutral-300 active:bg-neutral-800"
            >
              Clear
            </button>
          );
        }
        const punctuation = key === "," || key === "-";
        let ariaLabel: string | undefined;
        if (key === ",") ariaLabel = "Comma";
        else if (key === "-") ariaLabel = "Dash";
        return (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={ariaLabel}
            className={`flex min-h-0 items-center justify-center overflow-hidden bg-neutral-900 font-bold leading-none text-white active:bg-neutral-800 ${
              punctuation ? "text-3xl" : "text-4xl"
            }`}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
