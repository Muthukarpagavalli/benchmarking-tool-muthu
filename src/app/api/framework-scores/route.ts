import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { frameworkId, toolId, criterionId, score } = body;
  if (!frameworkId || !toolId || !criterionId) {
    return NextResponse.json({ error: "frameworkId, toolId and criterionId required" }, { status: 400 });
  }

  const existing = await prisma.scoringFrameworkScore.findFirst({
    where: { frameworkId, toolId, criterionId },
  });

  if (existing) {
    const updated = await prisma.scoringFrameworkScore.update({
      where: { id: existing.id },
      data: { score },
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.scoringFrameworkScore.create({
    data: { frameworkId, toolId, criterionId, score },
  });
  return NextResponse.json(created);
}
