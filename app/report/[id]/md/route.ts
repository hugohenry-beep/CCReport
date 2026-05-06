import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db/snapshots";
import { renderTemplatedMarkdown } from "@/lib/render/templated";
import type { Metrics } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const snap = await getSnapshot(id);
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const metrics = snap.metricsJson as unknown as Metrics;
  const md = renderTemplatedMarkdown(metrics);
  return new NextResponse(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="report-${id}.md"`,
    },
  });
}
