import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
  type AppRole,
} from "@/lib/auth/session";
import { verifyPin } from "@/lib/event/repository";
import { error, json } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

function parseRole(value: string | null): AppRole | null {
  if (value === "operator" || value === "hostess") {
    return value;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      role?: AppRole | "player";
      pin?: string;
    };
    if (body.role === "player") {
      return error("Players do not need a PIN", 400);
    }
    if (!body.role || !body.pin) return error("role and pin required");
    const valid = await verifyPin(body.role, body.pin);
    if (!valid) return error("Invalid PIN", 401);
    await setSessionCookie(body.role);
    return json({
      ok: true,
      role: body.role,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Login failed", 500);
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const role = parseRole(url.searchParams.get("role"));
  if (!role) return error("role query param required");
  await clearSessionCookie(role);
  return json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = parseRole(url.searchParams.get("role"));
  if (!role) return error("role query param required");
  const session = await getSession(role);
  if (!session) return json({ authenticated: false });
  return json({
    authenticated: true,
    role: session.role,
  });
}
