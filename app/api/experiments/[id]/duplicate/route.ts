import { NextResponse } from "next/server";
import { getRuntime } from "@/src/server/runtime";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const experiment = getRuntime().store.duplicateExperiment(id);
    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not duplicate experiment." },
      { status: 400 },
    );
  }
}
