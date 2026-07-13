import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    await prisma.scoringFramework.update({
      where: { id: params.frameworkId },
      data: { name },
    });
  }
  if (body.clientName !== undefined) {
    await prisma.scoringFramework.update({
      where: { id: params.frameworkId },
      data: { clientName: body.clientName ? String(body.clientName).trim() : null },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  await prisma.scoringFramework.delete({ where: { id: params.frameworkId } });
  return NextResponse.json({ ok: true });
}
