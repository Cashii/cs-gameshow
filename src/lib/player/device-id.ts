const DEVICE_ID_KEY = "cs_gameshow_device_id";

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getDeviceCode(deviceId: string): string {
  return deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
}

/** Stable nickname for the operator vote log (not shown on the player UI). */
export function getPlayerDisplayName(deviceId: string): string {
  const tail = getDeviceCode(deviceId);
  return tail ? `Player ${tail}` : "Player";
}

export function summarizeUserAgent(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/CrOS/i.test(ua)) return "Chromebook";
  if (ua.trim()) return "Web";
  return "";
}

/** Persistent per-browser ID so each phone gets one vote per poll. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return generateDeviceId();
  }
}
