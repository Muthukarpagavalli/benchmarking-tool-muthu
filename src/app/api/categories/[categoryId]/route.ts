import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PATCH(req: NextRequest, { params }: { params: { categoryId: string } }) {
  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    data.name = name;
    data.slug = body.slug ? String(body.slug).trim() : slugify(name);
  } else if (body.slug !== undefined) {
    data.slug = String(body.slug).trim();
  }
  if (body.description !== undefined) {
    data.description = String(body.description ?? "").trim() || null;
  }
  const updated = await prisma.category.update({
    where: { id: params.categoryId },
    data,
  });
  return NextResponse.json(updated);
}
