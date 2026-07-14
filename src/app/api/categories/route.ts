import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const description = body.description === undefined ? undefined : String(body.description ?? "").trim() || null;

  const slugBase = slugify(name) || `category-${randomUUID().slice(0, 8)}`;
  let slug = slugBase;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${suffix++}`;
  }

  const category = await prisma.category.create({
    data: {
      slug,
      name,
      ...(body.description !== undefined ? { description } : {}),
    },
  });

  return NextResponse.json(category);
}
