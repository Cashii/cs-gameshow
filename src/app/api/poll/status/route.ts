import { getVoteStatus } from "@/lib/event/repository";
import { error, json } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pollId = url.searchParams.get("pollId");
  const deviceId = url.searchParams.get("deviceId");
  if (!pollId || !deviceId) {
    return error("pollId and deviceId required");
  }
  try {
    const status = await getVoteStatus(pollId, deviceId);
    return json(status);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}
