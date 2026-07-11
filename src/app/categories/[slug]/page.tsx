import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getQuickStats } from "@/lib/stats";
import CategoryClient from "./CategoryClient";

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
  const frameworks = (await prisma.$queryRaw`
    SELECT f.id, f.categoryId, f.name, f.clientName, f.createdAt, f.updatedAt
    FROM ScoringFramework f
    WHERE f.categoryId = ${category.id}
    ORDER BY f.updatedAt DESC
  `) as Array<{ id: string; categoryId: string; name: string; clientName: string | null; createdAt: Date; updatedAt: Date }>;
  const frameworkTools = (await prisma.$queryRaw`
    SELECT id, frameworkId, name, sortOrder
    FROM ScoringFrameworkTool
    ORDER BY sortOrder ASC
  `) as Array<{ id: string; frameworkId: string; name: string; sortOrder: number }>;
  const frameworkCriteria = (await prisma.$queryRaw`
    SELECT id, frameworkId, name, description, weight, sortOrder
    FROM ScoringFrameworkCriterion
    ORDER BY sortOrder ASC
  `) as Array<{ id: string; frameworkId: string; name: string; description: string | null; weight: number; sortOrder: number }>;
  const frameworkScores = (await prisma.$queryRaw`
    SELECT id, frameworkId, toolId, criterionId, score
    FROM ScoringFrameworkScore
  `) as Array<{ id: string; frameworkId: string; toolId: string; criterionId: string; score: number | null }>;
  const frameworkStackItems = (await prisma.$queryRaw`
    SELECT id, frameworkId, name, role, notes, sortOrder
    FROM ScoringFrameworkStackItem
  `) as Array<{ id: string; frameworkId: string; name: string; role: string | null; notes: string | null; sortOrder: number }>;
  const frameworksWithChildren = frameworks.map((framework) => ({
    ...framework,
    tools: frameworkTools.filter((tool) => tool.frameworkId === framework.id),
    criteria: frameworkCriteria.filter((criterion) => criterion.frameworkId === framework.id),
    scores: frameworkScores.filter((score) => score.frameworkId === framework.id),
    stackItems: frameworkStackItems.filter((item) => item.frameworkId === framework.id),
  }));
  const stats = await getQuickStats();

  return <CategoryClient category={{ ...category, frameworks: frameworksWithChildren }} stats={stats} />;
}
