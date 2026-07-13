import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.name !== undefined) {
    await prisma.scoringFrameworkCriterion.update({ where: { id: params.id }, data: { name: String(body.name).trim() } });
  }
  if (body.description !== undefined) {
    await prisma.scoringFrameworkCriterion.update({ where: { id: params.id }, data: { description: body.description } });
  }
  if (body.weight !== undefined) {
    await prisma.scoringFrameworkCriterion.update({ where: { id: params.id }, data: { weight: Number(body.weight) } });
  }
  if (body.sortOrder !== undefined) {
    await prisma.scoringFrameworkCriterion.update({ where: { id: params.id }, data: { sortOrder: Number(body.sortOrder) } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const criterion = await prisma.scoringFrameworkCriterion.findUnique({ where: { id: params.id }, select: { frameworkId: true } });
  const frameworkId = criterion?.frameworkId;
  await prisma.scoringFrameworkScore.deleteMany({ where: { criterionId: params.id } });
  await prisma.scoringFrameworkCriterion.delete({ where: { id: params.id } });
  if (frameworkId) {
    const remaining = await prisma.scoringFrameworkCriterion.findMany({
      where: { frameworkId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    const equalWeight = remaining.length > 0 ? 1 / remaining.length : 1;
    await prisma.scoringFrameworkCriterion.updateMany({
      where: { frameworkId },
      data: { weight: equalWeight },
    });
  }
  return NextResponse.json({ ok: true });
}
