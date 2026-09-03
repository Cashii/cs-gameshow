import type { CSSProperties } from "react";
import { clamp } from "@/lib/utils";

export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 4;

export type PhotoFit = {
  zoom: number;
  x: number;
  y: number;
};

export const DEFAULT_PHOTO_FIT: PhotoFit = { zoom: 1, x: 50, y: 50 };

export function normalizePhotoFit(raw: unknown): PhotoFit {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PHOTO_FIT };
  const value = raw as Partial<PhotoFit>;
  return {
    zoom: clamp(
      typeof value.zoom === "number" && Number.isFinite(value.zoom)
        ? value.zoom
        : DEFAULT_PHOTO_FIT.zoom,
      PHOTO_ZOOM_MIN,
      PHOTO_ZOOM_MAX,
    ),
    x: clamp(
      typeof value.x === "number" && Number.isFinite(value.x)
        ? value.x
        : DEFAULT_PHOTO_FIT.x,
      0,
      100,
    ),
    y: clamp(
      typeof value.y === "number" && Number.isFinite(value.y)
        ? value.y
        : DEFAULT_PHOTO_FIT.y,
      0,
      100,
    ),
  };
}

export function photoFitStyle(fit: PhotoFit | undefined): CSSProperties {
  const { zoom, x, y } = normalizePhotoFit(fit);
  return {
    objectFit: "contain",
    objectPosition: `${x}% ${y}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

/** Move the crop so the photo follows the pointer 1:1 inside the frame. */
export function panPhotoFit(
  fit: PhotoFit,
  dx: number,
  dy: number,
  frameWidth: number,
  frameHeight: number,
): PhotoFit {
  const { zoom, x, y } = normalizePhotoFit(fit);
  if (frameWidth < 1 || frameHeight < 1) return { zoom, x, y };
  // scale() + transform-origin: a 1px origin shift moves the image by (zoom - 1)px.
  // At zoom 1 only object-position can pan (letterboxed contain).
  const slack = zoom <= 1 ? 1 : zoom - 1;
  return {
    zoom,
    x: clamp(x - (dx / frameWidth) * 100 / slack, 0, 100),
    y: clamp(y - (dy / frameHeight) * 100 / slack, 0, 100),
  };
}
