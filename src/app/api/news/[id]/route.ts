import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { categoryId, categoryName, toolId, date, updateType, summary, sourceUrl, impact, loggedBy } = body;

  const entry = await prisma.newsEntry.update({
    where: { id: params.id },
    data: {
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
      ...(categoryName !== undefined ? { categoryName: categoryName || null } : {}),
      ...(toolId !== undefined ? { toolId: toolId || null } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(updateType !== undefined ? { updateType } : {}),
      ...(summary !== undefined ? { summary } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl: sourceUrl || null } : {}),
      ...(impact !== undefined ? { impact } : {}),
      ...(loggedBy !== undefined ? { loggedBy } : {}),
    },
  });

  return NextResponse.json(entry);
}

