export function StatusSwitch({
  checked,
  disabled,
  labelOn,
  labelOff,
  ariaLabel,
  onToggle,
  size = "md",
}: Readonly<{
  checked: boolean;
  disabled?: boolean;
  labelOn: string;
  labelOff: string;
  ariaLabel: string;
  onToggle: () => void;
  size?: "lg" | "md" | "sm";
}>) {
  const compact = size === "sm";
  const large = size === "lg";
  return (
    <div
      className={`flex items-center ${
        large ? "gap-3" : compact ? "w-32 shrink-0 gap-1.5" : "gap-2"
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onToggle}
        className={`relative shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          large ? "h-11 w-20" : compact ? "h-5 w-9" : "h-7 w-12"
        } ${checked ? "bg-emerald-500" : "bg-neutral-500"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${
            large
              ? `h-10 w-10 ${checked ? "translate-x-9" : "translate-x-0"}`
              : compact
                ? `h-4 w-4 ${checked ? "translate-x-4" : "translate-x-0"}`
                : `h-6 w-6 ${checked ? "translate-x-5" : "translate-x-0"}`
          }`}
        />
      </button>
      <span
        className={`whitespace-nowrap ${
          large
            ? "text-base font-semibold"
            : compact
              ? "text-xs font-normal"
              : "text-sm font-semibold"
        } ${checked ? "text-emerald-700" : "text-red-600"}`}
      >
        {checked ? labelOn : labelOff}
      </span>
    </div>
  );
}
