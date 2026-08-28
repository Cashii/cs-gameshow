export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

export function mediaIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/media\/([a-fA-F0-9]{24})(?:\?.*)?$/);
  return match?.[1] ?? null;
}
