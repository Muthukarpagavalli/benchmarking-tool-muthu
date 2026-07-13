import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.title !== undefined) {
    await prisma.scoringFrameworkGapItem.update({ where: { id: params.id }, data: { title: String(body.title).trim() } });
  }
  if (body.notes !== undefined) {
    await prisma.scoringFrameworkGapItem.update({
      where: { id: params.id },
      data: { notes: body.notes ? String(body.notes).trim() : null },
    });
  }
  if (body.sortOrder !== undefined) {
    await prisma.scoringFrameworkGapItem.update({ where: { id: params.id }, data: { sortOrder: Number(body.sortOrder) } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.scoringFrameworkGapItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
