import { NextResponse } from "next/server";
import {
  baselineCreationAllowed,
  getRuntime,
} from "@/src/server/runtime";
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
    const requestedKind = body.kind ?? "technical";
    if (requestedKind === "baseline" && !baselineCreationAllowed()) {
      throw new Error(
        "Baseline creation is disabled until the real-provider technical shakeout is reviewed.",
      );
    }
    if (requestedKind === "baseline" && runtime.adapter.name === "fake") {
      throw new Error("A baseline requires a configured cloud model adapter.");
    }
    const experiment = runtime.store.createExperiment({
      name: body.name?.trim() || undefined,
      kind: requestedKind,
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
