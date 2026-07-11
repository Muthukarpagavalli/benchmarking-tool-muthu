import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.ourFirmStatus !== undefined) data.ourFirmStatus = body.ourFirmStatus;
  if (body.ourFirmNotes !== undefined) data.ourFirmNotes = body.ourFirmNotes;
  if (body.name !== undefined) data.name = body.name;
  const tool = await prisma.tool.update({ where: { id: params.id }, data });
  return NextResponse.json(tool);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$transaction([
    prisma.toolCapability.deleteMany({ where: { toolId: params.id } }),
    prisma.toolScore.deleteMany({ where: { toolId: params.id } }),
    prisma.newsEntry.updateMany({ where: { toolId: params.id }, data: { toolId: null } }),
    prisma.peerAdoption.updateMany({ where: { toolId: params.id }, data: { toolId: null } }),
    prisma.tool.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
