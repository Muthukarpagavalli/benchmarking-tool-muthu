import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const toolId = req.nextUrl.searchParams.get("toolId");
  const featureType = req.nextUrl.searchParams.get("featureType");
  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");
  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (toolId) where.toolId = toolId;
  if (featureType) where.updateType = featureType;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
  }
  const entries = await prisma.newsEntry.findMany({
    where,
    include: { category: true, tool: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { categoryId, toolId, date, updateType, summary, sourceUrl, impact, loggedBy } = body;
  if (!categoryId || !date || !updateType || !summary || !impact || !loggedBy) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }
  const entry = await prisma.newsEntry.create({
    data: {
      categoryId,
      toolId: toolId || null,
      date: new Date(date),
      updateType,
      summary,
      sourceUrl: sourceUrl || null,
      impact,
      loggedBy,
    },
  });
  return NextResponse.json(entry);
}
