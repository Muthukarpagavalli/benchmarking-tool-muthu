import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.name !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkCriterion SET name = ${String(body.name).trim()} WHERE id = ${params.id}`;
  }
  if (body.description !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkCriterion SET description = ${body.description} WHERE id = ${params.id}`;
  }
  if (body.weight !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkCriterion SET weight = ${Number(body.weight)} WHERE id = ${params.id}`;
  }
  if (body.sortOrder !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkCriterion SET sortOrder = ${Number(body.sortOrder)} WHERE id = ${params.id}`;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM ScoringFrameworkScore WHERE criterionId = ${params.id}`,
    prisma.$executeRaw`DELETE FROM ScoringFrameworkCriterion WHERE id = ${params.id}`,
  ]);
  return NextResponse.json({ ok: true });
}
