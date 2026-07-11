import { prisma } from "@/lib/prisma";
import { getQuickStats } from "@/lib/stats";
import TopBar from "@/components/TopBar";

export default async function Home() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { tools: true },
  });
  const stats = await getQuickStats();

  return (
    <div>
      <TopBar title="Dashboard" stats={stats} />
      <h2>Market knowledge bank</h2>
      <p className="muted">
        Feature comparison matrices and weighted scoring frameworks per category, adapted from Muthu's
        market research spreadsheet. Click a category to explore or edit it.
      </p>
      <div className="category-grid">
        {categories.map((c: any) => (
          <a key={c.id} className="category-card" href={`/categories/${c.slug}`}>
            <h3>{c.name}</h3>
            <p>{c.description}</p>
            <p style={{ marginTop: 8 }}>{c.tools.length} tools tracked</p>
          </a>
        ))}
      </div>
    </div>
  );
}
