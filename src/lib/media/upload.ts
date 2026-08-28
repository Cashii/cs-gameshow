import { mediaIdFromUrl } from "@/lib/media/urls";

/** Keep uploads well under the server 4MB cap. */
const TARGET_BYTES = 900 * 1024;
const HARD_MAX_BYTES = 4 * 1024 * 1024;
const EDGE_STEPS = [1280, 1024, 800, 640];
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.46, 0.36];

type LoadedSource = {
  width: number;
  height: number;
  drawable: CanvasImageSource;
  close: () => void;
};

async function blobFromCanvas(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) throw new Error("Could not compress image");
  return blob;
}

async function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compress image");
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function scaledSize(
  source: LoadedSource,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

async function loadWithBitmap(file: File): Promise<LoadedSource> {
  const options = { imageOrientation: "from-image" as const };
  const bitmap = await createImageBitmap(file, options);
  return {
    width: bitmap.width,
    height: bitmap.height,
    drawable: bitmap,
    close: () => bitmap.close(),
  };
}

async function loadWithImage(file: File): Promise<LoadedSource> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    });
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      drawable: image,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function loadSource(file: File): Promise<LoadedSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await loadWithBitmap(file);
    } catch {
      // HEIC and some camera formats fail here; try an <img> decode.
    }
  }
  return loadWithImage(file);
}

function toJpegFile(blob: Blob): File {
  return new File([blob], "item.jpg", { type: "image/jpeg" });
}

export async function compressImageFile(file: File): Promise<File> {
  const source = await loadSource(file);
  try {
    if (source.width < 1 || source.height < 1) {
      throw new Error("Could not read image");
    }

    let best: File | null = null;
    for (const edge of EDGE_STEPS) {
      const { width, height } = scaledSize(source, edge);
      const canvas = await drawToCanvas(source.drawable, width, height);
      for (const quality of QUALITY_STEPS) {
        const next = toJpegFile(await blobFromCanvas(canvas, quality));
        if (!best || next.size < best.size) best = next;
        if (next.size <= TARGET_BYTES) return next;
      }
    }

    if (best && best.size <= HARD_MAX_BYTES) return best;
    throw new Error(
      "Photo is still too large after compression. Try a smaller image.",
    );
  } finally {
    source.close();
  }
}

export async function uploadMedia(file: File): Promise<string> {
  const compressed = await compressImageFile(file);
  const form = new FormData();
  form.append("file", compressed, compressed.name);
  const res = await fetch("/api/media", { method: "POST", body: form });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url;
}

export async function deleteMediaByUrl(url: string): Promise<void> {
  const id = mediaIdFromUrl(url);
  if (!id) return;
  try {
    await fetch(`/api/media/${id}`, { method: "DELETE" });
  } catch {
    // orphaned media is harmless for a local event
  }
}

export async function replaceMedia(oldUrl: string, file: File): Promise<string> {
  const nextUrl = await uploadMedia(file);
  if (oldUrl && oldUrl !== nextUrl) {
    void deleteMediaByUrl(oldUrl);
  }
  return nextUrl;
}
