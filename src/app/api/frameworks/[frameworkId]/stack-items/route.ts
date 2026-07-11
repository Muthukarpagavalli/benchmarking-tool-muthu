import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const items = (await prisma.$queryRaw`
    SELECT id, frameworkId, name, role, notes, sortOrder
    FROM ScoringFrameworkStackItem
    WHERE frameworkId = ${params.frameworkId}
    ORDER BY sortOrder ASC
  `) as Array<{ id: string; frameworkId: string; name: string; role: string | null; notes: string | null; sortOrder: number }>;
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const role = body.role ? String(body.role).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const count = (await prisma.$queryRaw`
    SELECT COUNT(1) AS count
    FROM ScoringFrameworkStackItem
    WHERE frameworkId = ${params.frameworkId}
  `) as Array<{ count: number }>;
  const sortOrder = Number(count[0]?.count ?? 0);
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO ScoringFrameworkStackItem (id, frameworkId, name, role, notes, sortOrder)
    VALUES (${id}, ${params.frameworkId}, ${name}, ${role}, ${notes}, ${sortOrder})
  `;
  return NextResponse.json({ id, frameworkId: params.frameworkId, name, role, notes, sortOrder });
}
