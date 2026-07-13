import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CategoryClient from "./CategoryClient";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    include: {
      tools: { orderBy: { name: "asc" } },
      capabilities: {
        orderBy: { order: "asc" },
        include: { entries: true },
      },
      criteria: {
        orderBy: { order: "asc" },
        include: { scores: true },
      },
    },
  });
  if (!category) notFound();
  const frameworks = await prisma.scoringFramework.findMany({
    where: { categoryId: category.id },
    orderBy: { updatedAt: "desc" },
    include: {
      tools: { orderBy: { sortOrder: "asc" } },
      criteria: { orderBy: { sortOrder: "asc" } },
      scores: true,
      stackItems: { orderBy: { sortOrder: "asc" } },
      gapItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  return <CategoryClient category={{ ...category, frameworks }} />;
}
