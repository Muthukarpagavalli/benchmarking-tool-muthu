import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const existing = (await prisma.$queryRaw`
    SELECT COUNT(1) AS count
    FROM ScoringFrameworkTool
    WHERE frameworkId = ${params.frameworkId}
  `) as Array<{ count: number }>;
  const sortOrder = Number(existing[0]?.count ?? 0);
  const id = randomUUID();
  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO ScoringFrameworkTool (id, frameworkId, name, sortOrder)
      VALUES (${id}, ${params.frameworkId}, ${name}, ${sortOrder})
    `,
    prisma.$executeRaw`
      INSERT INTO ScoringFrameworkScore (id, frameworkId, toolId, criterionId, score)
      SELECT NEWID(), ${params.frameworkId}, ${id}, c.id, NULL
      FROM ScoringFrameworkCriterion c
      WHERE c.frameworkId = ${params.frameworkId}
    `,
  ]);

  return NextResponse.json({ id, frameworkId: params.frameworkId, name, sortOrder });
}
