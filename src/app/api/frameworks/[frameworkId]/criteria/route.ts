import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const description = body.description ?? null;
  const existingCount = await prisma.scoringFrameworkCriterion.count({ where: { frameworkId: params.frameworkId } });
  const sortOrder = existingCount;
  const criteria = await prisma.scoringFrameworkCriterion.findMany({
    where: { frameworkId: params.frameworkId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const total = criteria.length + 1;
  const equalWeight = total > 0 ? 1 / total : 1;
  const criterion = await prisma.scoringFrameworkCriterion.create({
    data: {
      frameworkId: params.frameworkId,
      name,
      description,
      weight: equalWeight,
      sortOrder,
    },
  });
  const tools = await prisma.scoringFrameworkTool.findMany({
    where: { frameworkId: params.frameworkId },
    select: { id: true },
  });
  await prisma.scoringFrameworkScore.createMany({
    data: tools.map((tool) => ({
      frameworkId: params.frameworkId,
      toolId: tool.id,
      criterionId: criterion.id,
      score: null,
    })),
  });
  await prisma.scoringFrameworkCriterion.updateMany({
    where: {
      frameworkId: params.frameworkId,
      id: { not: criterion.id },
    },
    data: { weight: equalWeight },
  });

  return NextResponse.json(criterion);
}
