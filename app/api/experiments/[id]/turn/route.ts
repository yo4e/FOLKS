import { NextResponse } from "next/server";
import { getRuntime } from "@/src/server/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "one" | "continue";
    };
    const runtime = getRuntime();
    const result =
      body.mode === "continue"
        ? await runtime.engine.runUntilStopped(id)
        : [await runtime.engine.runNextTurn(id)];
    const safeResult = result.map((item) => ({
      owner: item.owner,
      committed: item.committed,
      reusedPersistedResponse: item.reusedPersistedResponse,
      turn: {
        id: item.turn.id,
        cycle: item.turn.cycle,
        residentId: item.turn.residentId,
        status: item.turn.status,
      },
    }));
    return NextResponse.json({
      result: safeResult,
      folks: runtime.store.getFolksView(id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not run turn." },
      { status: 400 },
    );
  }
}
