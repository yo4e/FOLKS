import { NextResponse } from "next/server";
import { getRuntime } from "@/src/server/runtime";
import type { ExperimentKind } from "@/src/core/types";

export async function GET() {
  const runtime = getRuntime();
  return NextResponse.json(runtime.store.listExperiments());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      kind?: ExperimentKind;
    };
    const runtime = getRuntime();
    const experiment = runtime.store.createExperiment({
      name: body.name?.trim() || undefined,
      kind: body.kind === "technical" ? "technical" : "baseline",
      modelAdapter: runtime.adapter.name,
      modelIdentifier: runtime.adapter.modelIdentifier,
      promptVersion: runtime.adapter.promptVersion,
    });
    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create experiment." },
      { status: 400 },
    );
  }
}
