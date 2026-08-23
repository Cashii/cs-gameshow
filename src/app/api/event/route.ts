import { normalizeSuiteState, type SuiteState } from "@/lib/suite-state";
import {
  importSuiteState,
  updateEventSuite,
} from "@/lib/event/repository";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const { buildSnapshot } = await import("@/lib/event/repository");
    const snapshot = await buildSnapshot();
    if (since !== null && Number(since) === snapshot.revision) {
      return new Response(null, { status: 204 });
    }
    return json(snapshot);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to load event", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const body = (await request.json()) as {
      suite?: Partial<SuiteState>;
      import?: SuiteState;
    };

    if (body.import) {
      const snapshot = await importSuiteState(normalizeSuiteState(body.import));
      return json(snapshot);
    }

    if (!body.suite) return error("Missing suite patch");

    const snapshot = await updateEventSuite((prev) =>
      normalizeSuiteState({ ...prev, ...body.suite }),
    );
    return json({ ok: true, revision: snapshot.revision });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Update failed", 500);
  }
}
