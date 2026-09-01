export const UI_THEME_STORAGE_KEY = "cs_gameshow_ui_theme";
export const UI_THEME_EVENT = "cs-gameshow-ui-theme";

export type UiTheme = "dark" | "light";

export const DEFAULT_UI_THEME: UiTheme = "dark";

export function isUiTheme(value: unknown): value is UiTheme {
  return value === "dark" || value === "light";
}

export function readUiTheme(): UiTheme {
  if (typeof window === "undefined") return DEFAULT_UI_THEME;
  try {
    const raw = localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiTheme(raw) ? raw : DEFAULT_UI_THEME;
  } catch {
    return DEFAULT_UI_THEME;
  }
}

export function writeUiTheme(theme: UiTheme) {
  try {
    localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(
    new CustomEvent(UI_THEME_EVENT, { detail: theme }),
  );
}

export function applyUiThemeClass(theme: UiTheme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("studio-ui");
  } else {
    root.classList.remove("studio-ui");
  }
}
