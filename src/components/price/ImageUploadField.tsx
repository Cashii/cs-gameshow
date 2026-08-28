"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { replaceMedia } from "@/lib/media/upload";

export function ImageUploadField({
  imageUrl,
  onUploaded,
  onError,
  label = "Upload photo",
  compact = false,
  square = false,
}: Readonly<{
  imageUrl: string;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  label?: string;
  compact?: boolean;
  square?: boolean;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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

  let frameClass = "h-40";
  if (square) frameClass = "aspect-square mx-auto w-full max-w-52";
  else if (compact) frameClass = "h-28";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label={imageUrl ? "Replace photo" : label}
        className={`group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-600 bg-neutral-900 text-neutral-400 hover:border-sky-500 hover:text-sky-300 disabled:opacity-60 ${frameClass}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className={`h-full w-full bg-neutral-950 ${square ? "object-cover" : "object-contain"}`}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm font-semibold">
            <ImagePlus size={22} />
            {label}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white">
            <LoaderCircle className="animate-spin" size={28} />
          </span>
        )}
      </button>
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
      {imageUrl && (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="text-sm font-semibold text-sky-400 hover:text-sky-300"
        >
          Replace photo
        </button>
      )}
    </div>
  );
}
