import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const sortOrder = await prisma.scoringFrameworkTool.count({ where: { frameworkId: params.frameworkId } });
  const tool = await prisma.scoringFrameworkTool.create({
    data: {
      frameworkId: params.frameworkId,
      name,
      sortOrder,
    },
  });
  const criteria = await prisma.scoringFrameworkCriterion.findMany({
    where: { frameworkId: params.frameworkId },
    select: { id: true },
  });
  await prisma.scoringFrameworkScore.createMany({
    data: criteria.map((criterion) => ({
      frameworkId: params.frameworkId,
      toolId: tool.id,
      criterionId: criterion.id,
      score: null,
    })),
  });
  return NextResponse.json(tool);
}
