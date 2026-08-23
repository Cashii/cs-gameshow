import { NextResponse } from "next/server";
import type { AppRole, SessionPayload } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireRole(
  ...roles: AppRole[]
): Promise<SessionPayload | NextResponse> {
  for (const role of roles) {
    const session = await getSession(role);
    if (session) return session;
  }
  return error("Unauthorized", 401);
}

export function isErrorResponse(
  value: SessionPayload | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
