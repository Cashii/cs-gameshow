export function StatusSwitch({
  checked,
  disabled,
  labelOn,
  labelOff,
  ariaLabel,
  onToggle,
}: Readonly<{
  checked: boolean;
  disabled?: boolean;
  labelOn: string;
  labelOff: string;
  ariaLabel: string;
  onToggle: () => void;
}>) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          checked ? "bg-emerald-500" : "bg-neutral-500"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span
        className={`text-sm font-semibold ${
          checked ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {checked ? labelOn : labelOff}
      </span>
    </div>
  );
}
