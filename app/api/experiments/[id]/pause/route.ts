import { NextResponse } from "next/server";
import { getRuntime } from "@/src/server/runtime";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const experiment = getRuntime().store.pauseExperiment(id);
    return NextResponse.json({
      experiment: {
        name: experiment.name,
        status: experiment.status,
        committedCycle: experiment.committedCycle,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not pause experiment." },
      { status: 400 },
    );
  }
}
