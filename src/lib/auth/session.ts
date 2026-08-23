import { cookies } from "next/headers";
import { createHash, createHmac } from "crypto";

export type AppRole = "operator" | "hostess";

export type SessionPayload = {
  role: AppRole;
  playerSessionId: string;
  exp: number;
};

const LEGACY_COOKIE_NAME = "cs_gameshow_session";
const SESSION_DAYS = 7;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

export function cookieNameForRole(role: AppRole): string {
  return `cs_gameshow_session_${role}`;
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin.trim()).digest("hex");
}

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(role: AppRole): Promise<void> {
  const payload: SessionPayload = {
    role,
    playerSessionId: "none",
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const token = signSession(payload);
  const jar = await cookies();
  jar.set(cookieNameForRole(role), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  jar.delete(LEGACY_COOKIE_NAME);
}

export async function clearSessionCookie(role: AppRole): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieNameForRole(role));
}

export async function getSession(role: AppRole): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(cookieNameForRole(role))?.value;
  if (!token) {
    const legacy = jar.get(LEGACY_COOKIE_NAME)?.value;
    if (legacy) {
      const payload = verifySession(legacy);
      if (payload?.role === role) return payload;
    }
    return null;
  }
  const payload = verifySession(token);
  if (!payload || payload.role !== role) return null;
  return payload;
}
