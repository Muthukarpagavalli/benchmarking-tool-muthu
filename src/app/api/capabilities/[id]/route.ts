import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  const capability = await prisma.capability.update({ where: { id: params.id }, data });
  return NextResponse.json(capability);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$transaction([
    prisma.toolCapability.deleteMany({ where: { capabilityId: params.id } }),
    prisma.capability.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
