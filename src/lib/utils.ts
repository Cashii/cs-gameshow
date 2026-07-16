export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
