import { prisma } from "@/lib/prisma";
import CategoryDescriptionEditor from "@/components/CategoryDescriptionEditor";

export const dynamic = "force-dynamic";

function cleanDescription(text: string | null | undefined) {
  return (text ?? "").replace(/[\u2014\u2013]/g, ". ");
}

function displayCategoryName(category: { slug: string; name: string }) {
  if (category.slug === "genai") return "GenAI";
  return category.name;
}

export default async function Home() {
  let categories: Array<any> = [];
  let dbError: string | null = null;

  try {
    categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { tools: true },
    });
  } catch (error) {
    dbError =
      "Database connection failed. Check that your database is running and DATABASE_URL is set correctly.";
  }

  return (
    <div>
      <h2>Client Advisory Workspace</h2>
      <p className="muted">
        A single workspace for market research across tools and firms, combining feature comparison matrices,
        adoption tracking, peer benchmarking, and scoring frameworks by category. Click a category to explore
        or edit it.
      </p>
      {dbError ? (
        <div
          style={{
            margin: "16px 0",
            padding: "12px 14px",
            borderRadius: 8,
            background: "#fff4e5",
            border: "1px solid #f0c36d",
            color: "#7a4b00",
          }}
        >
          {dbError}
        </div>
      ) : null}
      <div className="category-grid">
        {categories.map((c: any) => (
          <div key={c.id} className="category-card">
            <h3>{displayCategoryName(c)}</h3>
            <p>{cleanDescription(c.description)}</p>
            <p style={{ marginTop: 8 }}>{c.tools.length} tools tracked</p>
            <CategoryDescriptionEditor categoryId={c.id} initialDescription={c.description} />
            <a className="category-open-link" href={`/categories/${c.slug}`}>
              Open category
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
