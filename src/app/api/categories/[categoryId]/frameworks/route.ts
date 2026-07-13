import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { categoryId: string } }) {
  const frameworks = await prisma.scoringFramework.findMany({
    where: { categoryId: params.categoryId },
    orderBy: { updatedAt: "desc" },
    include: {
      tools: { orderBy: { sortOrder: "asc" } },
      criteria: { orderBy: { sortOrder: "asc" } },
      scores: true,
    },
  });
  return NextResponse.json(frameworks);
}

export async function POST(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const clientName = body.clientName ? String(body.clientName).trim() : null;

  const [baseTools, baseCriteria] = await Promise.all([
    prisma.tool.findMany({ where: { categoryId: params.categoryId }, orderBy: { name: "asc" } }),
    prisma.scoringCriterion.findMany({ where: { categoryId: params.categoryId }, orderBy: { order: "asc" } }),
  ]);

  const framework = await prisma.scoringFramework.create({
    data: {
      categoryId: params.categoryId,
      name,
      clientName,
      tools: {
        create: baseTools.map((tool, index) => ({
          name: tool.name,
          sortOrder: index,
        })),
      },
      criteria: {
        create: baseCriteria.map((criterion, index) => ({
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          sortOrder: index,
        })),
      },
    },
    include: {
      tools: true,
      criteria: true,
      scores: true,
      stackItems: true,
      gapItems: true,
    },
  });

  return NextResponse.json(framework);
}
