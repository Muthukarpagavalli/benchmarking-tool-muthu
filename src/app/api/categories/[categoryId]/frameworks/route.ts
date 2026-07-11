import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RawFramework = {
  id: string;
  categoryId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(_req: NextRequest, { params }: { params: { categoryId: string } }) {
  const frameworks = (await prisma.$queryRaw`
    SELECT id, categoryId, name, createdAt, updatedAt
    FROM ScoringFramework
    WHERE categoryId = ${params.categoryId}
    ORDER BY updatedAt DESC
  `) as RawFramework[];

  const tools = (await prisma.$queryRaw`
    SELECT id, frameworkId, name, sortOrder
    FROM ScoringFrameworkTool
    ORDER BY sortOrder ASC
  `) as Array<{ id: string; frameworkId: string; name: string; sortOrder: number }>;
  const criteria = (await prisma.$queryRaw`
    SELECT id, frameworkId, name, description, weight, sortOrder
    FROM ScoringFrameworkCriterion
    ORDER BY sortOrder ASC
  `) as Array<{
    id: string;
    frameworkId: string;
    name: string;
    description: string | null;
    weight: number;
    sortOrder: number;
  }>;
  const scores = (await prisma.$queryRaw`
    SELECT id, frameworkId, toolId, criterionId, score
    FROM ScoringFrameworkScore
  `) as Array<{ id: string; frameworkId: string; toolId: string; criterionId: string; score: number | null }>;

  const grouped = frameworks.map((framework) => ({
    ...framework,
    tools: tools.filter((tool) => tool.frameworkId === framework.id),
    criteria: criteria.filter((criterion) => criterion.frameworkId === framework.id),
    scores: scores.filter((score) => score.frameworkId === framework.id),
  }));

  return NextResponse.json(grouped);
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

  const frameworkId = randomUUID();
  const now = new Date();
  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO ScoringFramework (id, categoryId, name, createdAt, updatedAt)
      VALUES (${frameworkId}, ${params.categoryId}, ${name}, ${now}, ${now})
    `,
    ...baseTools.map((tool, index) =>
      prisma.$executeRaw`
        INSERT INTO ScoringFrameworkTool (id, frameworkId, name, sortOrder)
        VALUES (${randomUUID()}, ${frameworkId}, ${tool.name}, ${index})
      `
    ),
    ...baseCriteria.map((criterion, index) =>
      prisma.$executeRaw`
        INSERT INTO ScoringFrameworkCriterion (id, frameworkId, name, description, weight, sortOrder)
        VALUES (${randomUUID()}, ${frameworkId}, ${criterion.name}, ${criterion.description}, ${criterion.weight}, ${index})
      `
    ),
  ]);

  if (clientName) {
    await prisma.$executeRaw`
      UPDATE ScoringFramework
      SET clientName = ${clientName}
      WHERE id = ${frameworkId}
    `;
  }

  return NextResponse.json({ id: frameworkId, name, clientName, categoryId: params.categoryId });
}
