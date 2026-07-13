import { prisma } from "@/lib/prisma";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [entries, categories, tools, peerFirms] = await Promise.all([
    prisma.newsEntry.findMany({ include: { category: true, tool: true }, orderBy: { date: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tool.findMany({ orderBy: { name: "asc" } }),
    prisma.peerFirm.findMany(),
  ]);
  const featureTypes = Array.from(
    new Set(entries.map((entry) => entry.updateType).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const stats = {
    categories: categories.length,
    tools: tools.length,
    peerFirms: peerFirms.length,
    sightings: entries.length,
  };
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
