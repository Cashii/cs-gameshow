import { getTriviaMe } from "@/lib/trivia/store";
import { error, json } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId?.trim()) return error("deviceId required");
  try {
    const me = await getTriviaMe(deviceId.trim());
    return json(me);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}
