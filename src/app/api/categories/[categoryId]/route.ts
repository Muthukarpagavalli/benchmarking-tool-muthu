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
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const slug = body.slug ? String(body.slug).trim() : slugify(name);
  const updated = await prisma.category.update({
    where: { id: params.categoryId },
    data: { name, slug },
  });
  return NextResponse.json(updated);
}
