import { NextResponse } from "next/server";
import { getRuntime } from "@/src/server/runtime";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = getRuntime().store.getAuditExport(id);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": "attachment; filename=folks-audit-" + id + ".json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not export experiment." },
      { status: 404 },
    );
  }
}
