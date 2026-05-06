import { NextResponse } from "next/server";
import { listRecentSnapshots } from "@/lib/db/snapshots";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snaps = await listRecentSnapshots(30);
    return NextResponse.json(
      snaps.map((s) => ({
        id: s.id,
        periodStart: s.periodStart.toISOString(),
        periodEnd: s.periodEnd.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
