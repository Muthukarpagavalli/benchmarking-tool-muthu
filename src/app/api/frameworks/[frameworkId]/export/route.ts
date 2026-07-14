import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_HEIGHT = 30;

type Page = string;

type CriterionRow = {
  id: string;
  name: string;
  weight: number;
  description: string | null;
  sortOrder: number;
};

type VendorRow = {
  id: string;
  name: string;
  sortOrder: number;
};

type ScoreMap = Map<string, number | null>;

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, limit: number) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [""];

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

function rectOps(x: number, y: number, w: number, h: number, fill: [number, number, number], stroke?: [number, number, number]) {
  const ops = [`q ${fill[0]} ${fill[1]} ${fill[2]} rg ${x} ${y} ${w} ${h} re f`];
  if (stroke) ops.push(`q ${stroke[0]} ${stroke[1]} ${stroke[2]} RG 0.7 w ${x} ${y} ${w} ${h} re S Q`);
  ops.push("Q");
  return ops.join("\n");
}

function textOps(
  lines: string[],
  x: number,
  yTop: number,
  options: { size?: number; font?: 1 | 2; color?: [number, number, number]; lineGap?: number } = {}
) {
  const size = options.size ?? 10;
  const font = options.font ?? 1;
  const color = options.color ?? [0.12, 0.16, 0.13];
  const lineGap = options.lineGap ?? size + 3;
  const startY = yTop - size;
  const ops: string[] = [`BT /F${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg`];
  lines.forEach((line, index) => {
    ops.push(`1 0 0 1 ${x} ${startY - index * lineGap} Tm (${escapePdfText(line)}) Tj`);
  });
  ops.push("ET");
  return ops.join("\n");
}

function buildPdf(pages: Page[]) {
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

function header(title: string, subtitle: string, pageNumber: number, totalPages: number) {
  return [
    rectOps(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.99, 0.99, 0.985]),
    rectOps(0, PAGE_HEIGHT - 74, PAGE_WIDTH, 74, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
    textOps([title], MARGIN, PAGE_HEIGHT - 22, { size: 20, font: 2, color: [1, 1, 1] }),
    textOps([subtitle], MARGIN, PAGE_HEIGHT - 44, { size: 9.2, color: [0.92, 0.96, 0.92] }),
    textOps([`Page ${pageNumber} of ${totalPages}`], PAGE_WIDTH - MARGIN - 90, PAGE_HEIGHT - 22, { size: 8.5, color: [0.92, 0.96, 0.92] }),
  ].join("\n");
}

function footer(clientName: string, frameworkName: string, pageNumber: number, totalPages: number) {
  return [
    rectOps(0, 0, PAGE_WIDTH, FOOTER_HEIGHT, [0.985, 0.988, 0.982], [0.88, 0.91, 0.88]),
    textOps([clientName], MARGIN, 18, { size: 8.2, color: [0.26, 0.33, 0.27] }),
    textOps([frameworkName], PAGE_WIDTH / 2 - 70, 18, { size: 8.2, color: [0.26, 0.33, 0.27] }),
    textOps([`Page ${pageNumber} of ${totalPages}`], PAGE_WIDTH - MARGIN - 84, 18, { size: 8.2, color: [0.26, 0.33, 0.27] }),
  ].join("\n");
}

function card(x: number, y: number, w: number, h: number, title: string, lines: string[]) {
  return [
    rectOps(x, y, w, h, [1, 1, 1], [0.84, 0.89, 0.84]),
    rectOps(x, y + h - 24, w, 24, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
    textOps([title], x + 10, y + h - 9, { size: 11.2, font: 2, color: [1, 1, 1] }),
    textOps(lines.flatMap((line) => wrapText(line, Math.floor(w / 5.8))), x + 10, y + h - 38, { size: 8.9, color: [0.16, 0.19, 0.17] }),
  ].join("\n");
}

function sectionTitle(title: string, x: number, y: number, w: number) {
  return [
    rectOps(x, y, w, 22, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
    textOps([title], x + 10, y + 14, { size: 11, font: 2, color: [1, 1, 1] }),
  ].join("\n");
}

function paragraph(text: string, x: number, yTop: number, width: number, size = 10.2) {
  return textOps(wrapText(text, Math.floor(width / 5.6)), x, yTop, { size, color: [0.16, 0.19, 0.17], lineGap: size + 4 });
}

function tablePage(
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  pageNumber: number,
  totalPages: number,
  clientName: string,
  frameworkName: string
) {
  const headerTop = PAGE_HEIGHT - 106;
  const tableX = MARGIN;
  const tableW = CONTENT_WIDTH;
  const headerH = 22;
  const rowMinH = 24;

  const wrappedRows = rows.map((row) => row.map((cell, index) => wrapText(cell, Math.max(10, Math.floor((colWidths[index] ?? 80) / 5.7)))));
  const rowHeights = wrappedRows.map((row) => Math.max(rowMinH, Math.max(...row.map((cell) => cell.length)) * 10 + 6));
  const totalHeight = headerH + rowHeights.reduce((sum, h) => sum + h, 0);
  const bodyTop = headerTop - 40;
  const bodyBottom = bodyTop - totalHeight;
  const minBottom = FOOTER_HEIGHT + 14;
  if (bodyBottom < minBottom) {
    throw new Error("Table page overflow");
  }

  let output = `${header(title, subtitle, pageNumber, totalPages)}\n${sectionTitle(title, MARGIN, headerTop - 4, CONTENT_WIDTH)}`;
  output += `\n${textOps(wrapText(subtitle, 85), MARGIN, headerTop - 28, { size: 9.2, color: [0.32, 0.36, 0.33] })}`;
  output += `\n${rectOps(tableX, bodyBottom, tableW, totalHeight, [1, 1, 1], [0.84, 0.89, 0.84])}`;
  output += `\n${rectOps(tableX, bodyTop - headerH, tableW, headerH, [0.25, 0.39, 0.30], [0.88, 0.92, 0.88])}`;

  let cursorX = tableX;
  headers.forEach((headerText, index) => {
    output += `\n${textOps([headerText], cursorX + 8, bodyTop - 7, { size: 8.7, font: 2, color: [1, 1, 1] })}`;
    cursorX += colWidths[index] ?? 0;
  });

  let rowTop = bodyTop - headerH;
  wrappedRows.forEach((row, rowIndex) => {
    const rowH = rowHeights[rowIndex];
    const rowBottom = rowTop - rowH;
    const fill: [number, number, number] = rowIndex % 2 === 0 ? [0.997, 0.999, 0.996] : [0.986, 0.992, 0.986];
    output += `\n${rectOps(tableX, rowBottom, tableW, rowH, fill, [0.89, 0.93, 0.89])}`;
    let cellX = tableX;
    row.forEach((lines, cellIndex) => {
      const width = colWidths[cellIndex] ?? 80;
      if (cellIndex > 0) output += `\n${rectOps(cellX, rowBottom, 0.7, rowH, [0.93, 0.95, 0.93])}`;
      output += `\n${textOps(lines, cellX + 7, rowTop - 6, { size: 8.4, color: [0.12, 0.13, 0.12] })}`;
      cellX += width;
    });
    rowTop = rowBottom;
  });

  output += `\n${footer(clientName, frameworkName, pageNumber, totalPages)}`;
  return output;
}

function scoreLabel(totalPercent: number) {
  if (totalPercent >= 85) return "Strong Fit";
  if (totalPercent >= 75) return "Good Fit";
  if (totalPercent >= 60) return "Consider";
  return "Low Fit";
}

function recommendationSummary(totalPercent: number) {
  if (totalPercent >= 85) return "recommended for further consideration";
  if (totalPercent >= 75) return "a credible option for shortlist review";
  if (totalPercent >= 60) return "worth considering with targeted remediation";
  return "not the leading fit based on the workshop scoring";
}

function avgScore(values: Array<number | null | undefined>) {
  const clean = values.filter((v): v is number => typeof v === "number");
  if (!clean.length) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function highestAndLowest(criteria: CriterionRow[], scoresByCriterion: ScoreMap, vendorId: string) {
  const scored = criteria.map((criterion) => ({
    criterion,
    score: scoresByCriterion.get(`${vendorId}:${criterion.id}`),
  }));
  const filtered = scored.filter((item): item is { criterion: CriterionRow; score: number } => typeof item.score === "number");
  return {
    highest: [...filtered].sort((a, b) => b.score - a.score).slice(0, 2),
    lowest: [...filtered].sort((a, b) => a.score - b.score).slice(0, 2),
  };
}

function buildNarrative(vendorName: string, highest: Array<{ criterion: CriterionRow; score: number }>, lowest: Array<{ criterion: CriterionRow; score: number }>) {
  const highText = highest.length ? highest.map((item) => item.criterion.name.toLowerCase()).join(" and ") : "the evaluated requirements";
  const lowText = lowest.length ? lowest.map((item) => item.criterion.name.toLowerCase()).join(" and ") : "pricing and implementation considerations";
  return `${vendorName} performed strongest in ${highText} while showing comparatively weaker performance in ${lowText}.`;
}

function vendorChunks(vendors: VendorRow[], size = 3) {
  const chunks: VendorRow[][] = [];
  for (let i = 0; i < vendors.length; i += size) chunks.push(vendors.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

function criterionChunks(criteria: CriterionRow[], size = 20) {
  const chunks: CriterionRow[][] = [];
  for (let i = 0; i < criteria.length; i += size) chunks.push(criteria.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

function matrixPageCount(criteriaCount: number, vendorCount: number) {
  return Math.max(1, Math.ceil(vendorCount / 3)) * Math.max(1, Math.ceil(criteriaCount / 20));
}

export async function GET(_req: NextRequest, { params }: { params: { frameworkId: string } }) {
  const framework = await prisma.scoringFramework.findUnique({
    where: { id: params.frameworkId },
    include: {
      category: true,
      tools: { orderBy: { sortOrder: "asc" } },
      criteria: { orderBy: { sortOrder: "asc" } },
      scores: true,
      stackItems: { orderBy: { sortOrder: "asc" } },
      gapItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!framework) return new Response("Framework not found", { status: 404 });

  const displayName = framework.clientName?.trim() || framework.name;
  const clientName = framework.clientName?.trim() || "N/A";
  const technologyDomain = framework.category.name;
  const criteria: CriterionRow[] = [...framework.criteria].sort((a, b) => a.sortOrder - b.sortOrder);
  const vendors: VendorRow[] = [...framework.tools].sort((a, b) => a.sortOrder - b.sortOrder);
  const scoreMap: ScoreMap = new Map(framework.scores.map((score) => [`${score.toolId}:${score.criterionId}`, score.score]));

  const vendorStats = vendors.map((vendor) => {
    const scores = criteria.map((criterion) => scoreMap.get(`${vendor.id}:${criterion.id}`));
    const weightedTotal = criteria.reduce((sum, criterion) => {
      const score = scoreMap.get(`${vendor.id}:${criterion.id}`);
      return sum + (typeof score === "number" ? score * criterion.weight : 0);
    }, 0);
    const percentage = (weightedTotal / 5) * 100;
    const rankedCriteria = criteria
      .map((criterion) => ({ criterion, score: scoreMap.get(`${vendor.id}:${criterion.id}`) }))
      .filter((item): item is { criterion: CriterionRow; score: number } => typeof item.score === "number")
      .sort((a, b) => b.score - a.score);
    return {
      vendor,
      average: avgScore(scores),
      weightedTotal,
      percentage,
      recommendation: scoreLabel(percentage),
      rankedCriteria,
    };
  });

  const ranked = [...vendorStats].sort((a, b) => b.percentage - a.percentage);
  const winner = ranked[0];
  const currentStack = framework.stackItems;
  const gapItems = framework.gapItems;

  const executiveSummary = winner
    ? `This workshop evaluated ${vendors.length} ${technologyDomain} vendors against the client's business requirements using weighted scoring agreed during the evaluation session. Based on the workshop results, ${winner.vendor.name} achieved the highest overall score and is recommended for further consideration.`
    : "This workshop evaluated the vendor landscape against the client's business requirements using weighted scoring agreed during the evaluation session.";

  const totalPages = 2 + matrixPageCount(criteria.length, vendors.length) + 1 + Math.max(1, vendors.length) + 1;
  const pages: Page[] = [];

  pages.push(
    [
      header("Client Advisory Workspace", `${displayName} | Executive Summary`, 1, totalPages),
      textOps([`Report title: ${framework.name}`], MARGIN, PAGE_HEIGHT - 110, { size: 18, font: 2, color: [0.15, 0.28, 0.19] }),
      textOps([`Client name: ${clientName}`], MARGIN, PAGE_HEIGHT - 136, { size: 10.4, color: [0.18, 0.22, 0.19] }),
      textOps([`Technology domain: ${technologyDomain}`], MARGIN, PAGE_HEIGHT - 154, { size: 10.1, color: [0.18, 0.22, 0.19] }),
      textOps([`Framework name: ${framework.name}`], MARGIN, PAGE_HEIGHT - 172, { size: 10.1, color: [0.18, 0.22, 0.19] }),
      textOps([`Date: ${new Date().toLocaleDateString()}`], MARGIN, PAGE_HEIGHT - 190, { size: 10.1, color: [0.18, 0.22, 0.19] }),
      rectOps(MARGIN, PAGE_HEIGHT - 246, CONTENT_WIDTH, 42, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
      textOps([`Overall recommendation: ${winner ? `${winner.vendor.name} is the recommended vendor for the next stage of evaluation.` : "No recommendation could be generated."}`], MARGIN + 12, PAGE_HEIGHT - 222, {
        size: 11.3,
        font: 2,
        color: [1, 1, 1],
      }),
      card(
        MARGIN,
        PAGE_HEIGHT - 420,
        (CONTENT_WIDTH - 12) / 2,
        140,
        "Current Technology Stack",
        currentStack.length ? currentStack.map((item) => `${item.role ?? "General"}: ${item.name}${item.notes ? ` - ${item.notes}` : ""}`) : ["No current stack items recorded."]
      ),
      card(
        MARGIN + (CONTENT_WIDTH - 12) / 2 + 12,
        PAGE_HEIGHT - 420,
        (CONTENT_WIDTH - 12) / 2,
        140,
        "Gap Analysis",
        gapItems.length ? gapItems.map((item) => `${item.title}${item.notes ? ` - ${item.notes}` : ""}`) : ["No gap items recorded."]
      ),
      rectOps(MARGIN, PAGE_HEIGHT - 590, CONTENT_WIDTH, 124, [1, 1, 1], [0.84, 0.89, 0.84]),
      sectionTitle("Executive Summary", MARGIN, PAGE_HEIGHT - 566, CONTENT_WIDTH),
      paragraph(executiveSummary, MARGIN + 10, PAGE_HEIGHT - 594, CONTENT_WIDTH - 20, 10.8),
      footer(displayName, framework.name, 1, totalPages),
    ].join("\n")
  );

  const rankingRows = ranked.map((entry, index) => [String(index + 1), entry.vendor.name, entry.weightedTotal.toFixed(1), `${entry.percentage.toFixed(1)}%`, entry.recommendation]);
  pages.push(
    tablePage(
      "Vendor Ranking",
      "Professional ranking table with weighted scores, percentage conversion and recommendation labels.",
      ["Rank", "Vendor", "Weighted Score", "Percentage", "Recommendation"],
      rankingRows,
      [42, 170, 100, 90, 121],
      2,
      totalPages,
      displayName,
      framework.name
    )
  );

  let pageNumber = 3;
  for (const criterionChunk of criterionChunks(criteria)) {
    for (const vendorChunk of vendorChunks(vendors)) {
      const headers = ["Criteria", "Weight", ...vendorChunk.map((vendor) => vendor.name)];
      const colWidths = [190, 56, ...vendorChunk.map(() => 115)];
      const rows = criterionChunk.map((criterion) => {
        const scores = vendorChunk.map((vendor) => {
          const score = scoreMap.get(`${vendor.id}:${criterion.id}`);
          return typeof score === "number" ? score.toFixed(1) : "-";
        });
        return [criterion.name, `${Math.round(criterion.weight * 100)}%`, ...scores];
      });
      pages.push(
        tablePage(
          "Scoring Matrix",
          vendorChunk.length ? `Complete workshop scoring matrix. Vendors on this page: ${vendorChunk.map((v) => v.name).join(", ")}.` : "Complete workshop scoring matrix.",
          headers,
          rows,
          colWidths,
          pageNumber,
          totalPages,
          displayName,
          framework.name
        )
      );
      pageNumber += 1;
    }
  }

  const weightedRows = criteria.map((criterion) => {
    const perVendor = vendors
      .map((vendor) => {
        const score = scoreMap.get(`${vendor.id}:${criterion.id}`);
        return { vendor, score: typeof score === "number" ? score : -1 };
      })
      .sort((a, b) => b.score - a.score);
    const highest = perVendor[0];
    return [
      criterion.name,
      `${Math.round(criterion.weight * 100)}%`,
      highest?.vendor.name ?? "-",
      highest && highest.score >= 0 ? `${highest.vendor.name} led this criterion with ${highest.score.toFixed(1)}.` : "No scored data was captured.",
    ];
  });

  pages.push(
    tablePage(
      "Weighted Results",
      "How the weighted totals were calculated from the workshop scoring.",
      ["Criterion", "Weight", "Highest Vendor", "Notes"],
      weightedRows,
      [190, 60, 120, 173],
      pageNumber,
      totalPages,
      displayName,
      framework.name
    )
  );
  pageNumber += 1;

  for (const entry of vendorStats) {
    const { highest, lowest } = highestAndLowest(criteria, scoreMap, entry.vendor.id);
    const highestText = highest.length ? highest.map((item) => `${item.criterion.name} (${item.score.toFixed(1)})`).join("; ") : "No scored data captured.";
    const lowestText = lowest.length ? lowest.map((item) => `${item.criterion.name} (${item.score.toFixed(1)})`).join("; ") : "No scored data captured.";
    const comments = buildNarrative(entry.vendor.name, highest, lowest);
    pages.push(
      [
        header("Vendor Strengths", `${displayName} | ${entry.vendor.name}`, pageNumber, totalPages),
        rectOps(MARGIN, PAGE_HEIGHT - 180, CONTENT_WIDTH, 100, [1, 1, 1], [0.84, 0.89, 0.84]),
        textOps([`Vendor: ${entry.vendor.name}`], MARGIN + 10, PAGE_HEIGHT - 96, { size: 15, font: 2, color: [0.15, 0.28, 0.19] }),
        textOps([`Average score: ${entry.average.toFixed(1)} / 5`], MARGIN + 10, PAGE_HEIGHT - 118, { size: 10.5, color: [0.2, 0.24, 0.21] }),
        textOps([`Weighted score: ${entry.weightedTotal.toFixed(1)} | ${entry.percentage.toFixed(1)}% | ${entry.recommendation}`], MARGIN + 10, PAGE_HEIGHT - 136, {
          size: 10.2,
          color: [0.2, 0.24, 0.21],
        }),
        rectOps(MARGIN, PAGE_HEIGHT - 348, CONTENT_WIDTH, 150, [0.98, 0.992, 0.98], [0.84, 0.89, 0.84]),
        sectionTitle("Highest scoring capabilities", MARGIN, PAGE_HEIGHT - 210, CONTENT_WIDTH),
        paragraph(highestText, MARGIN + 10, PAGE_HEIGHT - 230, CONTENT_WIDTH - 20, 9.6),
        textOps([`Lowest scoring capabilities`], MARGIN + 10, PAGE_HEIGHT - 274, { size: 11.2, font: 2, color: [0.15, 0.28, 0.19] }),
        paragraph(lowestText, MARGIN + 10, PAGE_HEIGHT - 294, CONTENT_WIDTH - 20, 9.6),
        rectOps(MARGIN, PAGE_HEIGHT - 500, CONTENT_WIDTH, 128, [1, 1, 1], [0.84, 0.89, 0.84]),
        sectionTitle("Overall Comments", MARGIN, PAGE_HEIGHT - 472, CONTENT_WIDTH),
        paragraph(comments, MARGIN + 10, PAGE_HEIGHT - 496, CONTENT_WIDTH - 20, 10.6),
        footer(displayName, framework.name, pageNumber, totalPages),
      ].join("\n")
    );
    pageNumber += 1;
  }

  const recommendation = ranked[0];
  const summaryReason = recommendation
    ? `${recommendation.vendor.name} scored highest overall and offers the strongest combination of weighted fit, workshop performance and practical alignment to the current stack.`
    : "No recommendation could be produced because the framework contains no scored vendors.";
  const stackConsiderations = currentStack.length ? currentStack.slice(0, 4).map((item) => `${item.role ?? "General"}: ${item.name}`).join("; ") : "No current stack items were captured.";
  const gapAlignment = gapItems.length ? gapItems.slice(0, 4).map((item) => item.title).join("; ") : "No gap items were captured.";

  pages.push(
    [
      header("Consultant Recommendation", `${displayName} | Final Recommendation`, pageNumber, totalPages),
      rectOps(MARGIN, PAGE_HEIGHT - 182, CONTENT_WIDTH, 110, [1, 1, 1], [0.84, 0.89, 0.84]),
      textOps([`Recommended Vendor`], MARGIN + 10, PAGE_HEIGHT - 96, { size: 11.5, font: 2, color: [0.15, 0.28, 0.19] }),
      textOps([recommendation?.vendor.name ?? "N/A"], MARGIN + 10, PAGE_HEIGHT - 118, { size: 17, font: 2, color: [0.15, 0.28, 0.19] }),
      textOps([`Reasoning`], MARGIN + 10, PAGE_HEIGHT - 142, { size: 11.2, font: 2, color: [0.15, 0.28, 0.19] }),
      paragraph(summaryReason, MARGIN + 10, PAGE_HEIGHT - 160, CONTENT_WIDTH - 20, 10.4),
      rectOps(MARGIN, PAGE_HEIGHT - 346, CONTENT_WIDTH, 128, [0.98, 0.992, 0.98], [0.84, 0.89, 0.84]),
      sectionTitle("Current Stack Considerations", MARGIN, PAGE_HEIGHT - 318, CONTENT_WIDTH),
      paragraph(stackConsiderations, MARGIN + 10, PAGE_HEIGHT - 340, CONTENT_WIDTH - 20, 10.1),
      rectOps(MARGIN, PAGE_HEIGHT - 496, CONTENT_WIDTH, 128, [1, 1, 1], [0.84, 0.89, 0.84]),
      sectionTitle("Gap Analysis Alignment", MARGIN, PAGE_HEIGHT - 468, CONTENT_WIDTH),
      paragraph(gapAlignment, MARGIN + 10, PAGE_HEIGHT - 490, CONTENT_WIDTH - 20, 10.1),
      rectOps(MARGIN, PAGE_HEIGHT - 628, CONTENT_WIDTH, 98, [0.25, 0.39, 0.30], [0.23, 0.35, 0.27]),
      textOps([`Next Steps`], MARGIN + 10, PAGE_HEIGHT - 556, { size: 11.5, font: 2, color: [1, 1, 1] }),
      paragraph(
        recommendation
          ? `${recommendation.vendor.name} should be taken into the next stage of evaluation. Validate implementation approach, commercial terms, and security requirements before final procurement decisions are made.`
          : "No next steps could be derived from an empty framework.",
        MARGIN + 10,
        PAGE_HEIGHT - 578,
        CONTENT_WIDTH - 20,
        10.2
      ),
      footer(displayName, framework.name, pageNumber, totalPages),
    ].join("\n")
  );

  return new Response(buildPdf(pages), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safePdfName(displayName)}.pdf"`,
    },
  });
}
