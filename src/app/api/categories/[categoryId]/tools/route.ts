import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const tool = await prisma.tool.create({
    data: {
      categoryId: params.categoryId,
      name,
      ourFirmStatus: "unknown",
    },
  });

  const capabilities = await prisma.capability.findMany({
    where: { categoryId: params.categoryId },
    select: { id: true },
  });

  await prisma.toolCapability.createMany({
    data: capabilities.map((capability) => ({
      toolId: tool.id,
      capabilityId: capability.id,
      status: "unknown",
      notes: null,
    })),
  });

  return NextResponse.json(tool);
}
