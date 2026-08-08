import { NextResponse } from "next/server";
import { getRuntime } from "@/src/server/runtime";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const runtime = getRuntime();
    const view = new URL(request.url).searchParams.get("view");
    return NextResponse.json(
      view === "lab"
        ? runtime.store.getLabView(id)
        : runtime.store.getFolksView(id),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Experiment not found." },
      { status: 404 },
    );
  }
}
