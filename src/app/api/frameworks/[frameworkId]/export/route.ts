import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 24;

type PdfPage = string;

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, limit: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function textOps(lines: string[], x: number, y: number, size = 10, font: 1 | 2 = 1, color: [number, number, number] = [0.1, 0.1, 0.1]) {
  const ops: string[] = [`BT /F${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg`];
  let currentY = y;
  for (const line of lines) {
    ops.push(`1 0 0 1 ${x} ${currentY} Tm (${escapePdfText(line)}) Tj`);
    currentY -= size + 2;
  }
  ops.push("ET");
  return ops.join("\n");
}

function rectOps(x: number, y: number, w: number, h: number, fill: [number, number, number], stroke?: [number, number, number]) {
  const ops = [`q ${fill[0]} ${fill[1]} ${fill[2]} rg ${x} ${y} ${w} ${h} re f`];
  if (stroke) ops.push(`q ${stroke[0]} ${stroke[1]} ${stroke[2]} RG 1 w ${x} ${y} ${w} ${h} re S Q`);
  ops.push("Q");
  return ops.join("\n");
}

function buildPdf(page: PdfPage) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 6 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    `<< /Length ${page.length} >>\nstream\n${page}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function categoryRecommendations(slug: string) {
  const presets: Record<string, string[]> = {
    clm: ["Outlook", "Adobe Sign", "SharePoint", "GenAI review assistant"],
    dms: ["SharePoint", "iManage", "Outlook", "Adobe Sign"],
    "contract-intelligence": ["Outlook", "SharePoint", "Adobe Sign", "GenAI review assistant"],
    genai: ["Outlook", "SharePoint", "Copilot or chat assistant", "Governance controls"],
  };
  return presets[slug] ?? ["Outlook", "SharePoint", "Adobe Sign", "GenAI review assistant"];
}

function safePdfName(text: string) {
  return text.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "framework_report";
}

function section(
  title: string,
  lines: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  bodyLimit: number,
  bodySize = 8.7
) {
  return [
    rectOps(x, y, w, h, [0.975, 0.988, 0.975], [0.84, 0.89, 0.84]),
    textOps([title], x + 10, y + h - 18, 12, 2, [0.15, 0.28, 0.19]),
    textOps(lines.flatMap((line) => wrapText(line, bodyLimit)), x + 10, y + h - 35, bodySize),
  ].join("\n");
}

export async function GET(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const frameworkRows = (await prisma.$queryRaw`
    SELECT f.id, f.categoryId, f.name, f.clientName, c.name AS categoryName, c.slug AS categorySlug
    FROM ScoringFramework f
    INNER JOIN Category c ON c.id = f.categoryId
    WHERE f.id = ${params.frameworkId}
  `) as Array<{ id: string; categoryId: string; name: string; clientName: string | null; categoryName: string; categorySlug: string }>;
  const framework = frameworkRows[0];
  if (!framework) return new Response("Framework not found", { status: 404 });

  const tools = (await prisma.$queryRaw`
    SELECT id, name
    FROM ScoringFrameworkTool
    WHERE frameworkId = ${params.frameworkId}
    ORDER BY sortOrder ASC
  `) as Array<{ id: string; name: string }>;
  const criteria = (await prisma.$queryRaw`
    SELECT id, name, description, weight
    FROM ScoringFrameworkCriterion
    WHERE frameworkId = ${params.frameworkId}
    ORDER BY sortOrder ASC
  `) as Array<{ id: string; name: string; description: string | null; weight: number }>;
  const scores = (await prisma.$queryRaw`
    SELECT toolId, criterionId, score
    FROM ScoringFrameworkScore
    WHERE frameworkId = ${params.frameworkId}
  `) as Array<{ toolId: string; criterionId: string; score: number | null }>;
  const stackItems = (await prisma.$queryRaw`
    SELECT name, role, notes
    FROM ScoringFrameworkStackItem
    WHERE frameworkId = ${params.frameworkId}
    ORDER BY sortOrder ASC
  `) as Array<{ name: string; role: string | null; notes: string | null }>;

  const displayName = framework.clientName?.trim() || framework.name;
  const scoreMap = new Map(scores.map((score) => [`${score.toolId}:${score.criterionId}`, score.score]));
  const totals = tools
    .map((tool) => {
      let total = 0;
      for (const criterion of criteria) {
        const score = scoreMap.get(`${tool.id}:${criterion.id}`);
        if (score !== null && score !== undefined) total += score * criterion.weight;
      }
      return { tool: tool.name, total };
    })
    .sort((a, b) => b.total - a.total);
  const topVendor = totals[0]?.tool ?? "N/A";
  const recommendations = categoryRecommendations(framework.categorySlug);
  const topGaps = criteria
    .map((criterion) => {
      const values = tools.map((tool) => scoreMap.get(`${tool.id}:${criterion.id}`)).filter((v): v is number => typeof v === "number");
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { criterion, avg };
    })
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);

  const maxScore = criteria.reduce((sum, criterion) => sum + criterion.weight * 5, 0);
  const dateLabel = new Date().toLocaleDateString();
  const currentStackLines = stackItems.length
    ? stackItems
        .slice(0, 4)
        .map((item) => `${item.name}${item.role ? ` | ${item.role}` : ""}${item.notes ? ` | ${item.notes}` : ""}`)
    : ["No current stack items captured yet."];
  const targetStackLines = recommendations.slice(0, 4).map((item) => `Add or strengthen: ${item}`);
  const gapLines = topGaps.length
    ? topGaps.map((row) => `${row.criterion.name} | ${row.avg.toFixed(1)} / 5`)
    : ["No major capability gaps detected."];
  const rankingLines = totals.length
    ? totals.slice(0, 5).map((row, index) => `${index + 1}. ${row.tool} | ${row.total.toFixed(2)}`)
    : ["No vendors entered yet."];

  const headerHeight = 58;
  const overviewH = 74;
  const topY = PAGE_HEIGHT - headerHeight;
  const overviewY = PAGE_HEIGHT - headerHeight - overviewH - 12;
  const midY = 276;
  const leftW = 380;
  const gap = 10;
  const rightW = PAGE_WIDTH - MARGIN * 2 - leftW - gap;

  const page = [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.98]),
    rectOps(0, topY, PAGE_WIDTH, headerHeight, [0.25, 0.39, 0.30]),
    textOps(["Scoring framework report"], MARGIN, PAGE_HEIGHT - 23, 10.5, 2, [0.92, 0.96, 0.92]),
    textOps([displayName], MARGIN, PAGE_HEIGHT - 40, 18, 2, [1, 1, 1]),
    textOps([`Client presentation export | ${dateLabel}`], PAGE_WIDTH - 190, PAGE_HEIGHT - 23, 9, 1, [0.93, 0.96, 0.93]),

    rectOps(MARGIN, overviewY, PAGE_WIDTH - MARGIN * 2, overviewH, [1, 1, 1], [0.84, 0.89, 0.84]),
    textOps(["Framework overview"], MARGIN + 12, overviewY + overviewH - 18, 12, 2, [0.15, 0.28, 0.19]),
    textOps(
      [
        `Framework: ${framework.name}`,
        `Category: ${framework.categoryName}`,
        `Top recommendation: ${topVendor}`,
        `Maximum possible score: ${maxScore.toFixed(2)}`,
      ],
      MARGIN + 12,
      overviewY + overviewH - 35,
      9.1
    ),

    section("Current stack", currentStackLines, MARGIN, midY + 88, leftW, 88, 42),
    section("Target stack additions", targetStackLines, MARGIN + leftW + gap, midY + 88, rightW, 88, 42),

    rectOps(MARGIN, midY, PAGE_WIDTH - MARGIN * 2, 78, [1, 1, 1], [0.84, 0.89, 0.84]),
    textOps(["Gap analysis"], MARGIN + 10, midY + 62, 12, 2, [0.15, 0.28, 0.19]),
    textOps(["Capability | Avg score"], MARGIN + 10, midY + 46, 9.5, 2, [0.15, 0.28, 0.19]),
    textOps(gapLines, MARGIN + 10, midY + 32, 8.6),

    rectOps(MARGIN, 92, PAGE_WIDTH - MARGIN * 2, 120, [0.975, 0.988, 0.975], [0.84, 0.89, 0.84]),
    textOps(["Vendor ranking"], MARGIN + 10, 202, 12, 2, [0.15, 0.28, 0.19]),
    textOps(["Rank | Vendor | Score"], MARGIN + 10, 186, 9.5, 2, [0.15, 0.28, 0.19]),
    textOps(rankingLines, MARGIN + 10, 172, 8.7),

    rectOps(MARGIN, 18, PAGE_WIDTH - MARGIN * 2, 56, [0.25, 0.39, 0.30], [0.21, 0.33, 0.25]),
    textOps([`Recommendation summary: ${topVendor} is the strongest fit for the current framework.`], MARGIN + 10, 50, 9.8, 2, [1, 1, 1]),
    textOps(
      [`Use the current stack and the target additions above to explain what exists today and what should be added next.`],
      MARGIN + 10,
      34,
      8.5,
      1,
      [0.92, 0.96, 0.92]
    ),
  ].join("\n");

  return new Response(buildPdf(page), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safePdfName(displayName)}.pdf"`,
    },
  });
}
