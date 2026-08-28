export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "???";
  const hasCents = Math.abs(value % 1) >= 0.005;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parsePriceInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function priceInputValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const hasCents = Math.abs(value % 1) >= 0.005;
  return hasCents ? value.toFixed(2) : String(value);
}
