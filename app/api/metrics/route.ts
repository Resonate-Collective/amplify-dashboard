// Computed metrics as JSON for the dashboard client. Auth-gated; node runtime
// (googleapis needs Node). Server-side cache with a Refresh bypass.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import { computeMetrics } from "@/lib/metrics";
import { readSheet, SheetsError } from "@/lib/sheets";
import type { Metrics } from "@/lib/types";

async function loadMetrics(): Promise<Metrics> {
  const { rows, reach } = await readSheet();
  return computeMetrics(rows, reach, new Date().toISOString());
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const bypass = new URL(req.url).searchParams.get("refresh") === "1";

  try {
    const { value, cachedAt } = await withCache(loadMetrics, bypass);
    return Response.json({ ok: true, metrics: value, cachedAt });
  } catch (e) {
    const message =
      e instanceof SheetsError
        ? e.message
        : "Unexpected error reading the dashboard data";
    console.error("[metrics] load failed:", e);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
