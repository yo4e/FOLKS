import { NextResponse } from "next/server";
import { STALE_GENERATION_MS } from "@/src/core/constants";
import { getRuntime } from "@/src/server/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      cycle?: number;
      staleAfterMs?: number;
    };
    const runtime = getRuntime();
    const experiment = runtime.store.getExperiment(id);
    if (!experiment) {
      throw new Error("Experiment not found.");
    }
    const cycle = body.cycle ?? experiment.committedCycle + 1;
    const result = await runtime.engine.recoverStaleTurn(
      id,
      cycle,
      body.staleAfterMs ?? STALE_GENERATION_MS,
    );
    return NextResponse.json({
      result: {
        owner: result.owner,
        committed: result.committed,
        reusedPersistedResponse: result.reusedPersistedResponse,
        turn: {
          id: result.turn.id,
          cycle: result.turn.cycle,
          residentId: result.turn.residentId,
          status: result.turn.status,
        },
      },
      folks: runtime.store.getFolksView(id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not recover turn." },
      { status: 400 },
    );
  }
}
