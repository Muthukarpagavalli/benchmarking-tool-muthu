import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.name !== undefined) {
    await prisma.scoringFrameworkStackItem.update({ where: { id: params.id }, data: { name: String(body.name).trim() } });
  }
  if (body.role !== undefined) {
    await prisma.scoringFrameworkStackItem.update({ where: { id: params.id }, data: { role: body.role } });
  }
  if (body.notes !== undefined) {
    await prisma.scoringFrameworkStackItem.update({ where: { id: params.id }, data: { notes: body.notes } });
  }
  if (body.sortOrder !== undefined) {
    await prisma.scoringFrameworkStackItem.update({ where: { id: params.id }, data: { sortOrder: Number(body.sortOrder) } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.scoringFrameworkStackItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
