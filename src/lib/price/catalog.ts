import {
  appendUnique,
  claimBankId,
  groupIdOf,
  legacyNamedPayload,
  type ContentGroup,
} from "@/lib/content-bank";
import { normalizePhotoFit, type PhotoFit } from "@/lib/price/photo-fit";

export type PriceCatalogItem = {
  id: string;
  imageUrl: string;
  label: string;
  price: number | null;
  photoFit: PhotoFit;
  /** Null means this item is ungrouped. */
  groupId: string | null;
};

function finitePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readCatalogItem(
  raw: unknown,
  fallbackLabel: string,
): Omit<PriceCatalogItem, "id" | "groupId"> | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<PriceCatalogItem>;
  const imageUrl = typeof record.imageUrl === "string" ? record.imageUrl : "";
  const ownLabel = typeof record.label === "string" ? record.label.trim() : "";
  const label = ownLabel || fallbackLabel;
  const price = finitePrice(record.price);
  if (!imageUrl && !label && price == null) return null;
  return {
    imageUrl,
    label,
    price,
    photoFit: normalizePhotoFit(record.photoFit),
  };
}

export function priceCatalogKey(
  item: Pick<PriceCatalogItem, "imageUrl" | "label" | "price" | "photoFit">,
): string {
  return JSON.stringify({
    label: item.label.trim(),
    price: item.price,
    photoFit: item.photoFit,
    hasPhoto: Boolean(item.imageUrl),
  });
}

export function mergePriceCatalog(
  existing: PriceCatalogItem[],
  incoming: PriceCatalogItem[],
): PriceCatalogItem[] {
  return appendUnique(existing, incoming, priceCatalogKey);
}

/** True when a photo is still on a live board or another saved item. */
export function priceImageStillUsed(
  url: string,
  catalog: readonly PriceCatalogItem[],
  exceptId: string,
  liveUrls: readonly string[],
): boolean {
  if (!url) return false;
  if (liveUrls.some((live) => live === url)) return true;
  return catalog.some((item) => item.id !== exceptId && item.imageUrl === url);
}

export function normalizePriceCatalog(
  raw: unknown,
  groups: readonly ContentGroup[] = [],
): PriceCatalogItem[] {
  if (!Array.isArray(raw)) return [];
  const items: PriceCatalogItem[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const legacy = legacyNamedPayload(entry);
    if (legacy) {
      const chunks = Array.isArray(legacy.payload)
        ? legacy.payload
        : [legacy.payload];
      chunks.forEach((chunk, chunkIndex) => {
        const item = readCatalogItem(chunk, legacy.name);
        if (!item) return;
        items.push({
          id: claimBankId(
            legacy.id ? `${legacy.id}-${chunkIndex}` : "",
            seen,
            `item-${index}-${chunkIndex}`,
          ),
          groupId: groupIdOf(chunk, groups),
          ...item,
        });
      });
      return;
    }
    const item = readCatalogItem(entry, "");
    if (!item) return;
    const id =
      entry &&
      typeof entry === "object" &&
      typeof (entry as { id?: unknown }).id === "string"
        ? (entry as { id: string }).id
        : "";
    items.push({
      id: claimBankId(id, seen, `item-${index}`),
      groupId: groupIdOf(entry, groups),
      ...item,
    });
  });
  return items;
}
