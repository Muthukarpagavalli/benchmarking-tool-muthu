import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const name = body.name !== undefined ? String(body.name).trim() : undefined;
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : undefined;
  if (name !== undefined) {
    await prisma.scoringFrameworkTool.update({ where: { id: params.id }, data: { name } });
  }
  if (sortOrder !== undefined) {
    await prisma.scoringFrameworkTool.update({ where: { id: params.id }, data: { sortOrder } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.scoringFrameworkScore.deleteMany({ where: { toolId: params.id } });
  await prisma.scoringFrameworkTool.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
