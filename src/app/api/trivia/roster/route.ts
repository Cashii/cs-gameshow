import { getTriviaRoster } from "@/lib/trivia/store";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;
  try {
    const roster = await getTriviaRoster();
    return json(roster);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}
