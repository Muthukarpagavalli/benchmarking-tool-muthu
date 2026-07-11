import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    await prisma.$executeRaw`
      UPDATE ScoringFramework
      SET name = ${name}, updatedAt = ${new Date()}
      WHERE id = ${params.frameworkId}
    `;
  }
  if (body.clientName !== undefined) {
    await prisma.$executeRaw`
      UPDATE ScoringFramework
      SET clientName = ${body.clientName ? String(body.clientName).trim() : null}, updatedAt = ${new Date()}
      WHERE id = ${params.frameworkId}
    `;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM ScoringFrameworkScore WHERE frameworkId = ${params.frameworkId}`,
    prisma.$executeRaw`DELETE FROM ScoringFrameworkTool WHERE frameworkId = ${params.frameworkId}`,
    prisma.$executeRaw`DELETE FROM ScoringFrameworkCriterion WHERE frameworkId = ${params.frameworkId}`,
    prisma.$executeRaw`DELETE FROM ScoringFramework WHERE id = ${params.frameworkId}`,
  ]);
  return NextResponse.json({ ok: true });
}
