"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyUiThemeClass,
  DEFAULT_UI_THEME,
  readUiTheme,
  UI_THEME_EVENT,
  UI_THEME_STORAGE_KEY,
  writeUiTheme,
  type UiTheme,
} from "@/lib/studio-theme";

type StudioThemeContextValue = {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
};

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null);

/** Applies dark/light studio palette on <html> so portaled dialogs/selects inherit it. */
export function StudioTheme({ children }: { children?: ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>(DEFAULT_UI_THEME);

  useEffect(() => {
    const initial = readUiTheme();
    setThemeState(initial);
    applyUiThemeClass(initial);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== UI_THEME_STORAGE_KEY) return;
      const next = readUiTheme();
      setThemeState(next);
      applyUiThemeClass(next);
    };
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<UiTheme>).detail;
      if (detail !== "dark" && detail !== "light") return;
      setThemeState(detail);
      applyUiThemeClass(detail);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(UI_THEME_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(UI_THEME_EVENT, onLocal);
      document.documentElement.classList.remove("studio-ui");
    };
  }, []);

  useEffect(() => {
    applyUiThemeClass(theme);
  }, [theme]);

  const setTheme = (next: UiTheme) => {
    setThemeState(next);
    writeUiTheme(next);
    applyUiThemeClass(next);
  };

  return (
    <StudioThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </StudioThemeContext.Provider>
  );
}

export function useStudioTheme(): StudioThemeContextValue {
  const ctx = useContext(StudioThemeContext);
  if (!ctx) {
    throw new Error("useStudioTheme must be used within StudioTheme");
  }
  return ctx;
}
