"use client";

import { useEffect } from "react";

/** Puts the light studio palette on <html> so portaled dialogs/selects inherit it. */
export function StudioTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("studio-ui");
    return () => root.classList.remove("studio-ui");
  }, []);
  return null;
}
