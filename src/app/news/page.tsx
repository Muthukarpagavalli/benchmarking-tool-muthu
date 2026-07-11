import { prisma } from "@/lib/prisma";
import { getQuickStats } from "@/lib/stats";
import NewsClient from "./NewsClient";

export default async function NewsPage() {
  const [entries, categories, tools] = await Promise.all([
    prisma.newsEntry.findMany({ include: { category: true, tool: true }, orderBy: { date: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tool.findMany({ orderBy: { name: "asc" } }),
  ]);
  const featureTypes = Array.from(
    new Set(entries.map((entry) => entry.updateType).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const stats = await getQuickStats();
  return (
    <NewsClient
      entries={entries.map((entry) => ({
        ...entry,
        date: entry.date.toISOString(),
      }))}
      categories={categories}
      tools={tools}
      featureTypes={featureTypes}
      stats={stats}
    />
  );
}
