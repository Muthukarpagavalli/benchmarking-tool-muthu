import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const categorySlug = req.nextUrl.searchParams.get("category");
  const where = categorySlug ? { category: { slug: categorySlug } } : {};
  const entries = await prisma.peerAdoption.findMany({
    where,
    include: { peerFirm: true, category: true, tool: true },
    orderBy: { dateLogged: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { peerFirmId, categoryId, toolId, dateLogged, sourceNote, sourceUrl } = body;
  if (!peerFirmId || !categoryId || !dateLogged || !sourceNote) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }
  const entry = await prisma.peerAdoption.create({
    data: {
      peerFirmId,
      categoryId,
      toolId: toolId || null,
      dateLogged: new Date(dateLogged),
      sourceNote,
      sourceUrl: sourceUrl || null,
    },
  });
  return NextResponse.json(entry);
}
