import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const name = body.name !== undefined ? String(body.name).trim() : undefined;
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : undefined;
  if (name !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkTool SET name = ${name} WHERE id = ${params.id}`;
  }
  if (sortOrder !== undefined) {
    await prisma.$executeRaw`UPDATE ScoringFrameworkTool SET sortOrder = ${sortOrder} WHERE id = ${params.id}`;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM ScoringFrameworkScore WHERE toolId = ${params.id}`,
    prisma.$executeRaw`DELETE FROM ScoringFrameworkTool WHERE id = ${params.id}`,
  ]);
  return NextResponse.json({ ok: true });
}
