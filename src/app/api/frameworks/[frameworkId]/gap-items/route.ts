import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const items = await prisma.scoringFrameworkGapItem.findMany({
    where: { frameworkId: params.frameworkId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const notes = body.notes ? String(body.notes).trim() : null;
  const sortOrder = await prisma.scoringFrameworkGapItem.count({ where: { frameworkId: params.frameworkId } });
  const item = await prisma.scoringFrameworkGapItem.create({
    data: { frameworkId: params.frameworkId, title, notes, sortOrder },
  });
  return NextResponse.json(item);
}
