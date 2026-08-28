"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ImagePlus, LoaderCircle, Minus, Plus, RotateCcw } from "lucide-react";
import { replaceMedia } from "@/lib/media/upload";
import {
  DEFAULT_PHOTO_FIT,
  PHOTO_ZOOM_MAX,
  PHOTO_ZOOM_MIN,
  normalizePhotoFit,
  panPhotoFit,
  photoFitStyle,
  type PhotoFit,
} from "@/lib/price/photo-fit";
import { clamp } from "@/lib/utils";

export function SquarePhotoEditor({
  imageUrl,
  fit,
  onUploaded,
  onFitChange,
  onError,
}: Readonly<{
  imageUrl: string;
  fit: PhotoFit;
  onUploaded: (url: string) => void;
  onFitChange: (fit: PhotoFit) => void;
  onError: (message: string) => void;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    fit: PhotoFit;
  } | null>(null);
  const parentSyncRafRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragFit, setDragFit] = useState<PhotoFit | null>(null);
  const currentFit = normalizePhotoFit(dragFit ?? fit);

  useEffect(() => {
    return () => {
      if (parentSyncRafRef.current != null) {
        cancelAnimationFrame(parentSyncRafRef.current);
      }
    };
  }, []);

  const syncParentFit = (next: PhotoFit) => {
    if (parentSyncRafRef.current != null) return;
    parentSyncRafRef.current = requestAnimationFrame(() => {
      parentSyncRafRef.current = null;
      const latest = dragRef.current?.fit ?? next;
      onFitChange(latest);
    });
  };

  const pick = async (file: File | undefined) => {
    if (!file || busy) return;
    const looksLikeImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      onError("Choose an image file");
      return;
    }
    setBusy(true);
    try {
      const url = await replaceMedia(imageUrl, file);
      onUploaded(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed";
      onError(
        /could not read|compress/i.test(message)
          ? "Could not read this photo. Try a JPEG or PNG."
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!imageUrl || busy || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      fit: currentFit,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic pointers cannot capture; moves still work on the frame.
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (drag?.pointerId !== event.pointerId || !frame) return;
    const rect = frame.getBoundingClientRect();
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.fit = panPhotoFit(drag.fit, dx, dy, rect.width, rect.height);
    setDragFit(drag.fit);
    syncParentFit(drag.fit);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const next = dragRef.current.fit;
    dragRef.current = null;
    if (parentSyncRafRef.current != null) {
      cancelAnimationFrame(parentSyncRafRef.current);
      parentSyncRafRef.current = null;
    }
    onFitChange(next);
    setDragFit(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const setZoom = (nextZoom: number) => {
    onFitChange({
      ...currentFit,
      zoom: clamp(nextZoom, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {imageUrl ? (
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Drag to reposition photo"
          className={`relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl border border-neutral-600 bg-neutral-950 ${
            dragFit ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none h-full w-full select-none"
            style={photoFitStyle(currentFit)}
          />
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white">
              <LoaderCircle className="animate-spin" size={28} />
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          className="relative aspect-square w-full overflow-hidden rounded-xl border border-dashed border-neutral-600 bg-neutral-950 text-neutral-400 hover:border-sky-500 hover:text-sky-300 disabled:opacity-60"
        >
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm font-semibold">
            <ImagePlus size={22} />
            Upload photo
          </span>
        </button>
      )}

      {imageUrl && (
        <>
          <p className="text-[11px] leading-tight text-neutral-500">
            Drag to reposition
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || currentFit.zoom <= PHOTO_ZOOM_MIN}
              onClick={() => setZoom(currentFit.zoom - 0.1)}
              className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
            <input
              type="range"
              min={PHOTO_ZOOM_MIN}
              max={PHOTO_ZOOM_MAX}
              step={0.05}
              value={currentFit.zoom}
              disabled={busy}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Photo zoom"
              className="h-1.5 min-w-0 flex-1 accent-sky-500"
            />
            <button
              type="button"
              disabled={busy || currentFit.zoom >= PHOTO_ZOOM_MAX}
              onClick={() => setZoom(currentFit.zoom + 0.1)}
              className="rounded-md p-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onFitChange({ ...DEFAULT_PHOTO_FIT })}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              aria-label="Reset photo position"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={openPicker}
            className="self-start text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            Replace photo
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          void pick(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
