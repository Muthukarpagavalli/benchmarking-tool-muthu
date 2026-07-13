import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const toolIds = Array.isArray(body.toolIds) ? (body.toolIds as string[]) : [];
  if (toolIds.length === 0) {
    return NextResponse.json({ error: "toolIds required" }, { status: 400 });
  }

  const current = await prisma.scoringFrameworkTool.findMany({
    where: { frameworkId: params.frameworkId },
    select: { id: true },
  });
  const validIds = new Set(current.map((row) => row.id));
  const orderedIds = toolIds.filter((id) => validIds.has(id));
  if (orderedIds.length !== current.length) {
    return NextResponse.json({ error: "toolIds must include every tool exactly once" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.scoringFrameworkTool.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
