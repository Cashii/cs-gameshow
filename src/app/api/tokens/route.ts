import { addTokens } from "@/lib/event/repository";
import { buildSnapshot } from "@/lib/event/repository";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireRole("operator", "hostess");
  if (isErrorResponse(session)) return session;

  try {
    const body = (await request.json()) as {
      tokens?: { number: string; colorId: string }[];
    };
    if (!body.tokens?.length) return error("tokens array required");
    const result = await addTokens(body.tokens);
    const snapshot = await buildSnapshot();
    return json({ ...result, snapshot });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to add tokens", 500);
  }
}
