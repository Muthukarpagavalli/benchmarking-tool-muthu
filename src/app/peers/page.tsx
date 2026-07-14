import { prisma } from "@/lib/prisma";
import PeersClient from "./PeersClient";

export const dynamic = "force-dynamic";

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

  return (
    <PeersClient
      peerFirms={peerFirms}
      categories={categories}
      tools={tools}
      adoptions={adoptions.map((adoption) => ({
        ...adoption,
        dateLogged: adoption.dateLogged.toISOString(),
        categoryName: adoption.categoryName ?? null,
      }))}
      stats={{
        categories: categories.length,
        tools: tools.length,
        peerFirms: peerFirms.length,
        sightings: adoptions.length,
      }}
    />
  );
}
