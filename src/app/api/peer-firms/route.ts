import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const firms = await prisma.peerFirm.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(firms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const firm = await prisma.peerFirm.create({ data: { name: body.name } });
  return NextResponse.json(firm);
}
