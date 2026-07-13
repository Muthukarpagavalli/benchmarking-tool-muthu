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

function buildPdf(pages: PdfPage[]) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((page, index) => {
    const pageObjNum = 5 + index * 2;
    const contentObjNum = pageObjNum + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
      `<< /Length ${page.length} >>\nstream\n${page}\nendstream`
    );
  });

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

function tableSection(
  title: string,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  w: number,
  colWidths: number[],
  headingFill: [number, number, number],
  headingText: [number, number, number],
  headerSize = 9.2,
  bodySize = 8.6
) {
  const headerH = 18;
  const rowH = rows.length ? 18 : 14;
  const h = 34 + headerH + rows.length * rowH;
  const top = y + h;
  let output = rectOps(x, y, w, h, [1, 1, 1], [0.84, 0.89, 0.84]);
  if (title.trim()) {
    output += `\n${rectOps(x, top - 28, w, 28, headingFill, headingFill)}`;
    output += `\n${textOps([title], x + 10, top - 10, 12, 2, headingText)}`;
  }

  let cursorX = x;
  const headerY = title.trim() ? top - 42 : top - 14;
  output += `\n${rectOps(x + 1, headerY - 12, w - 2, headerH, [0.975, 0.988, 0.975], [0.88, 0.92, 0.88])}`;
  for (let i = 0; i < headers.length; i++) {
    output += `\n${textOps([headers[i]], cursorX + 10, headerY - 1, headerSize, 2, [0.15, 0.28, 0.19])}`;
    cursorX += colWidths[i] ?? 0;
  }

  const startY = headerY - 16;
  rows.forEach((row, rowIndex) => {
    const rowTop = startY - rowIndex * rowH;
    output += `\n${rectOps(x + 1, rowTop - rowH + 1, w - 2, rowH, [1, 1, 1], [0.89, 0.93, 0.89])}`;
    let cellX = x;
    for (let col = 0; col < headers.length; col++) {
      const cellText = row[col] ?? "";
      output += `\n${textOps([cellText], cellX + 10, rowTop - 8, bodySize)}`;
      cellX += colWidths[col] ?? 0;
    }
  });

  return output;
}

function sectionTitle(title: string, x: number, y: number, w: number) {
  return [
    rectOps(x, y, w, 24, [0.25, 0.39, 0.30], [0.21, 0.33, 0.25]),
    textOps([title], x + 10, y + 15, 12, 2, [1, 1, 1]),
  ].join("\n");
}

function pageHeader(displayName: string, dateLabel: string) {
  const headerHeight = 58;
  const topY = PAGE_HEIGHT - headerHeight;
  return [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.98]),
    rectOps(0, topY, PAGE_WIDTH, headerHeight, [0.25, 0.39, 0.30]),
    textOps([`Scoring framework report for ${displayName}`], MARGIN, PAGE_HEIGHT - 23, 10.5, 2, [0.92, 0.96, 0.92]),
    textOps(["CLM Evaluation"], MARGIN, PAGE_HEIGHT - 40, 18, 2, [1, 1, 1]),
    textOps([`Client presentation export | ${dateLabel}`], PAGE_WIDTH - 190, PAGE_HEIGHT - 23, 9, 1, [0.93, 0.96, 0.93]),
  ].join("\n");
}

function chunkRows(rows: string[][], maxRows: number) {
  const chunks: string[][][] = [];
  for (let i = 0; i < rows.length; i += maxRows) {
    chunks.push(rows.slice(i, i + maxRows));
  }
  return chunks.length ? chunks : [[]];
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
  const gapItems = (await prisma.$queryRaw`
    SELECT title, notes
    FROM ScoringFrameworkGapItem
    WHERE frameworkId = ${params.frameworkId}
    ORDER BY sortOrder ASC
  `) as Array<{ title: string; notes: string | null }>;

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
  const currentStackLines = stackItems.length ? stackItems.slice(0, 4).map((item) => item.name) : ["No current stack items captured yet."];
  const gapItemLines = gapItems.length ? gapItems.map((item) => item.title) : ["No gap items captured yet."];
  const headerHeight = 58;
  const overviewH = 64;
  const topY = PAGE_HEIGHT - headerHeight;
  const overviewY = PAGE_HEIGHT - headerHeight - overviewH - 12;
  const stackY = 352;
  const scoreY = 230;
  const vendorY = 102;
  const leftW = 380;
  const gap = 10;
  const rightW = PAGE_WIDTH - MARGIN * 2 - leftW - gap;

  const firstPage = [
    pageHeader(displayName, dateLabel),
    rectOps(MARGIN, overviewY, PAGE_WIDTH - MARGIN * 2, 64, [1, 1, 1], [0.84, 0.89, 0.84]),
    textOps(["Framework overview"], MARGIN + 12, overviewY + 44, 12, 2, [0.15, 0.28, 0.19]),
    textOps(
      [
        `Framework: ${framework.name}`,
        `Client name: ${framework.clientName?.trim() || "N/A"}`,
        `Top recommendation: ${topVendor}`,
      ],
      MARGIN + 12,
      overviewY + 28,
      9.1
    ),

    section("Current stack", currentStackLines, MARGIN, stackY, leftW, 88, 42),
    section("Gap items", gapItemLines, MARGIN + leftW + gap, stackY, rightW, 88, 42),
  ].join("\n");

  const scoreRows = topGaps.length ? topGaps.map((row) => [row.criterion.name, `${row.avg.toFixed(1)} / 5`]) : [["No major score gaps detected.", ""]];
  const vendorRows = totals.length ? totals.slice(0, 5).map((row, index) => [String(index + 1), row.tool, row.total.toFixed(2)]) : [["", "No vendors entered yet.", ""]];

  const scoreChunks = chunkRows(scoreRows, 12);
  const vendorChunks = chunkRows(vendorRows, 14);

  const pages: string[] = [firstPage];
  scoreChunks.forEach((chunk, index) => {
    pages.push(
      [
        pageHeader(displayName, dateLabel),
        tableSection(
          `Score snapshot${scoreChunks.length > 1 ? ` (${index + 1}/${scoreChunks.length})` : ""}`,
          ["Capability", "Avg score"],
          chunk,
          MARGIN,
          235,
          PAGE_WIDTH - MARGIN * 2,
          [PAGE_WIDTH - MARGIN * 2 - 210, 210],
          [0.25, 0.39, 0.30],
          [1, 1, 1]
        ),
      ].join("\n")
    );
  });

  vendorChunks.forEach((chunk, index) => {
    const isLast = index === vendorChunks.length - 1;
    pages.push(
      [
        pageHeader(displayName, dateLabel),
        tableSection(
          `Vendor ranking${vendorChunks.length > 1 ? ` (${index + 1}/${vendorChunks.length})` : ""}`,
          ["Rank", "Vendor", "Score"],
          chunk,
          MARGIN,
          isLast ? 172 : 220,
          PAGE_WIDTH - MARGIN * 2,
          [52, 470, 120],
          [0.25, 0.39, 0.30],
          [1, 1, 1]
        ),
        ...(isLast
          ? [
              rectOps(MARGIN, 18, PAGE_WIDTH - MARGIN * 2, 56, [0.25, 0.39, 0.30], [0.21, 0.33, 0.25]),
              textOps([`Recommendation summary: ${topVendor} is the strongest fit for the current framework.`], MARGIN + 10, 50, 9.8, 2, [1, 1, 1]),
            ]
          : []),
      ].join("\n")
    );
  });

  return new Response(buildPdf(pages), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safePdfName(displayName)}.pdf"`,
    },
  });
}
