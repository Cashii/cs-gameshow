"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";
import { useSuite } from "@/lib/suite-provider";
import { Select } from "@/components/ui/Select";
import { StackedIconButton } from "@/components/ui/StackedIconButton";
import {
  createDefaultDerbyState,
  DERBY_THEME_OPTIONS,
  getDerbyTheme,
  isDerbyTheme,
  type DerbyTheme,
} from "@/lib/derby/types";

export function DerbyHeaderSettings() {
  const { state, updateDerby } = useSuite();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const game = state.derby ?? createDefaultDerbyState();
  const theme = getDerbyTheme(game);

  const setTheme = (next: DerbyTheme) => {
    updateDerby((prev) => ({ ...prev, theme: next }));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!rect || !panel) return;
      const margin = 8;
      const panelHeight = panel.offsetHeight;
      const panelWidth = panel.offsetWidth;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const openBelow =
        spaceBelow >= panelHeight || rect.top < panelHeight + margin;
      const unclampedTop = openBelow
        ? rect.bottom + margin
        : rect.top - panelHeight - margin;
      const maxTop = Math.max(margin, window.innerHeight - panelHeight - margin);
      const top = Math.min(Math.max(margin, unclampedTop), maxTop);
      const unclampedRight = window.innerWidth - rect.right;
      const maxRight = Math.max(
        margin,
        window.innerWidth - panelWidth - margin,
      );
      const right = Math.min(Math.max(margin, unclampedRight), maxRight);
      setPanelStyle({
        position: "fixed",
        top,
        right,
        bottom: "auto",
        maxHeight: window.innerHeight - margin * 2,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <StackedIconButton
        ref={buttonRef}
        aria-label="Derby Race settings"
        onClick={() => setOpen((value) => !value)}
        icon={<Settings size={18} />}
        label="Settings"
      />
      {mounted &&
        open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default border-0 bg-transparent"
            />
            <div
              ref={panelRef}
              className="fixed z-50 w-80 overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl"
              style={panelStyle}
            >
              <p className="mb-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                Settings
              </p>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-200">
                  Theme
                </p>
                <Select
                  aria-label="Derby theme"
                  value={theme}
                  onValueChange={(value) => {
                    if (isDerbyTheme(value)) setTheme(value);
                  }}
                  options={DERBY_THEME_OPTIONS}
                />
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
