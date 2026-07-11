import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { frameworkId, toolId, criterionId, score } = body;
  if (!frameworkId || !toolId || !criterionId) {
    return NextResponse.json({ error: "frameworkId, toolId and criterionId required" }, { status: 400 });
  }

  const existing = (await prisma.$queryRaw`
    SELECT TOP 1 id
    FROM ScoringFrameworkScore
    WHERE frameworkId = ${frameworkId} AND toolId = ${toolId} AND criterionId = ${criterionId}
  `) as Array<{ id: string }>;

  if (existing[0]) {
    await prisma.$executeRaw`
      UPDATE ScoringFrameworkScore
      SET score = ${score}
      WHERE id = ${existing[0].id}
    `;
    return NextResponse.json({ id: existing[0].id, frameworkId, toolId, criterionId, score });
  }

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO ScoringFrameworkScore (id, frameworkId, toolId, criterionId, score)
    VALUES (${id}, ${frameworkId}, ${toolId}, ${criterionId}, ${score})
  `;
  return NextResponse.json({ id, frameworkId, toolId, criterionId, score });
}
