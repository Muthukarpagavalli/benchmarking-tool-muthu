import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const capabilityCount = await prisma.capability.count({ where: { categoryId: params.categoryId } });
  const capability = await prisma.capability.create({
    data: {
      categoryId: params.categoryId,
      name,
      order: capabilityCount,
    },
  });

  const tools = await prisma.tool.findMany({
    where: { categoryId: params.categoryId },
    select: { id: true },
  });

  await prisma.toolCapability.createMany({
    data: tools.map((tool) => ({
      toolId: tool.id,
      capabilityId: capability.id,
      status: "unknown",
      notes: null,
    })),
  });

  return NextResponse.json(capability);
}
