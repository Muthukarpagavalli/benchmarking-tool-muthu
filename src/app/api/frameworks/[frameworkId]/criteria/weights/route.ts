import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type WeightUpdate = { id: string; weight: number };

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const updates = Array.isArray(body.weights) ? (body.weights as WeightUpdate[]) : [];
  if (updates.length === 0) {
    return NextResponse.json({ error: "weights required" }, { status: 400 });
  }

  await prisma.$transaction(
    updates.map((update) =>
      prisma.scoringFrameworkCriterion.update({
        where: { id: update.id },
        data: { weight: Number(update.weight) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
