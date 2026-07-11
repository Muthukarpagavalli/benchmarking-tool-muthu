import { prisma } from "@/lib/prisma";

export async function getQuickStats() {
  const [categories, tools, peerFirms, sightings] = await Promise.all([
    prisma.category.count(),
    prisma.tool.count(),
    prisma.peerFirm.count(),
    prisma.peerAdoption.count(),
  ]);
  return { categories, tools, peerFirms, sightings };
}
