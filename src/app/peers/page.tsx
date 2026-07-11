import { prisma } from "@/lib/prisma";
import { getQuickStats } from "@/lib/stats";
import PeersClient from "./PeersClient";

export default async function PeersPage() {
  const [peerFirms, categories, tools, adoptions] = await Promise.all([
    prisma.peerFirm.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tool.findMany({ orderBy: { name: "asc" } }),
    prisma.peerAdoption.findMany({
      include: { peerFirm: true, category: true, tool: true },
      orderBy: { dateLogged: "desc" },
    }),
  ]);
  const stats = await getQuickStats();

  return (
    <PeersClient
      peerFirms={peerFirms}
      categories={categories}
      tools={tools}
      adoptions={adoptions.map((adoption) => ({
        ...adoption,
        dateLogged: adoption.dateLogged.toISOString(),
      }))}
      stats={stats}
    />
  );
}
