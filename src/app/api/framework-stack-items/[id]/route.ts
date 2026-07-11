import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.name !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkStackItem SET name = ${String(body.name).trim()} WHERE id = ${params.id}`;
  }
  if (body.role !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkStackItem SET role = ${body.role} WHERE id = ${params.id}`;
  }
  if (body.notes !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkStackItem SET notes = ${body.notes} WHERE id = ${params.id}`;
  }
  if (body.sortOrder !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkStackItem SET sortOrder = ${Number(body.sortOrder)} WHERE id = ${params.id}`;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRaw`DELETE FROM ScoringFrameworkStackItem WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
