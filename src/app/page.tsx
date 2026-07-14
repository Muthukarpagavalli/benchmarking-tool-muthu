import { prisma } from "@/lib/prisma";
import CategoryCreateForm from "@/components/CategoryCreateForm";

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
  const hiddenDashboardSlugs = new Set(["contract-review-ai", "legal-research"]);

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
        {categories
          .filter((c: any) => !hiddenDashboardSlugs.has(c.slug))
          .map((c: any) => (
            <a key={c.id} className="category-card" href={`/categories/${c.slug}`}>
              <h3>{displayCategoryName(c)}</h3>
              <p>{cleanDescription(c.description)}</p>
              <p style={{ marginTop: 8 }}>{c.tools.length} tools tracked</p>
            </a>
          ))}
      </div>
      <CategoryCreateForm />
    </div>
  );
}
