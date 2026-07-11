import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { toolId, criterionId, score } = body;
  if (!toolId || !criterionId) {
    return NextResponse.json({ error: "toolId and criterionId required" }, { status: 400 });
  }
  const existing = await prisma.toolScore.findFirst({ where: { toolId, criterionId } });
  const record = existing
    ? await prisma.toolScore.update({ where: { id: existing.id }, data: { score } })
    : await prisma.toolScore.create({ data: { toolId, criterionId, score } });
  return NextResponse.json(record);
}
