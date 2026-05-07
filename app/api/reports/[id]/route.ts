import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { deleteSnapshot, updateSnapshot } from "@/lib/db/snapshots";

export const runtime = "nodejs";

function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { name?: unknown };
    const raw = typeof body.name === "string" ? body.name.trim() : "";
    const name = raw === "" ? null : raw;
    const updated = await updateSnapshot(id, { name });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      periodStart: updated.periodStart.toISOString(),
      periodEnd: updated.periodEnd.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteSnapshot(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
